/**
 * FitChain - GitHub API, Çakışma Önleme & Dinamik Duo Eşleştirme Motoru
 */

import { CONFIG } from "./config.js";

export function getGithubConfig() {
  const cfg = localStorage.getItem(CONFIG.STORAGE_KEYS.GITHUB_CONFIG);
  return cfg ? JSON.parse(cfg) : null;
}

export function setGithubConfig(owner, repo, token) {
  const cfg = { owner: owner.trim(), repo: repo.trim(), token: token.trim() };
  localStorage.setItem(CONFIG.STORAGE_KEYS.GITHUB_CONFIG, JSON.stringify(cfg));
  return cfg;
}

function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64(str) {
  return decodeURIComponent(escape(atob(str)));
}

export function generateDuoCode(username) {
  const prefix = (username || "USR").slice(0, 3).toUpperCase();
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `DUO-${prefix}-${randNum}`;
}

export async function fetchRemoteDatabase() {
  const cfg = getGithubConfig();
  if (!cfg) throw new Error("GitHub bağlantı ayarları bulunamadı.");

  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${CONFIG.DB_FILE_PATH}?ref=${CONFIG.DEFAULT_BRANCH}`;

  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${cfg.token}`,
      "Accept": "application/vnd.github+json"
    },
    cache: "no-store"
  });

  if (res.status === 404) {
    return { db: { accounts: {}, userData: {} }, sha: null };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub verisi çekilemedi (${res.status})`);
  }

  const payload = await res.json();
  const db = JSON.parse(fromBase64(payload.content));
  return { db, sha: payload.sha };
}

async function pushCommit(contentString, commitMessage, sha = null) {
  const cfg = getGithubConfig();
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${CONFIG.DB_FILE_PATH}`;

  const body = {
    message: commitMessage,
    content: toBase64(contentString),
    branch: CONFIG.DEFAULT_BRANCH
  };

  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${cfg.token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.message || "Commit işlemi başarısız.");
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  return data.content.sha;
}

export async function safeUpdateDatabase(mutatorFn, commitMessage = "Update FitChain data", maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const { db, sha } = await fetchRemoteDatabase();
      const updatedDb = mutatorFn(db);
      const jsonStr = JSON.stringify(updatedDb, null, 2);
      const newSha = await pushCommit(jsonStr, commitMessage, sha);
      return { success: true, newSha, db: updatedDb };
    } catch (err) {
      if (err.status === 409 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Veri çakışması 3 denemeden sonra çözülemedi. Lütfen tekrar deneyin.");
}

export async function saveUserDailyLog(username, dateStr, dayPatch) {
  const normalizedUser = username.toLowerCase().trim();
  const commitMsg = `Log data for ${normalizedUser} on ${dateStr}`;

  return await safeUpdateDatabase((db) => {
    if (!db.userData) db.userData = {};
    if (!db.userData[normalizedUser]) {
      db.userData[normalizedUser] = {
        settings: { startWeight: null, partner: null, duoCode: generateDuoCode(normalizedUser), theme: "blue" },
        logs: {}
      };
    }
    if (!db.userData[normalizedUser].logs) {
      db.userData[normalizedUser].logs = {};
    }

    const currentLog = db.userData[normalizedUser].logs[dateStr] || {};

    db.userData[normalizedUser].logs[dateStr] = {
      ...currentLog,
      ...dayPatch,
      metrics: {
        ...(currentLog.metrics || {}),
        ...(dayPatch.metrics || {})
      },
      habits: {
        ...(currentLog.habits || {}),
        ...(dayPatch.habits || {})
      }
    };

    if (dayPatch.metrics?.weight && !db.userData[normalizedUser].settings?.startWeight) {
      db.userData[normalizedUser].settings.startWeight = dayPatch.metrics.weight;
    }

    return db;
  }, commitMsg);
}

export async function registerNewUser(username, passwordHash, chosenTheme = "blue") {
  const normalizedUser = username.toLowerCase().trim();

  return await safeUpdateDatabase((db) => {
    if (!db.accounts) db.accounts = {};
    if (!db.userData) db.userData = {};

    if (db.accounts[normalizedUser]) {
      throw new Error("Bu kullanıcı adı veritabanında zaten kayıtlı.");
    }

    db.accounts[normalizedUser] = {
      passwordHash,
      createdAt: new Date().toISOString()
    };

    if (!db.userData[normalizedUser]) {
      db.userData[normalizedUser] = {
        settings: {
          startWeight: null,
          partner: null,
          duoCode: generateDuoCode(normalizedUser),
          theme: chosenTheme
        },
        logs: {}
      };
    }

    return db;
  }, `Register new user: ${normalizedUser}`);
}

/**
 * Duo Kodu Kullanarak İki Kullanıcıyı Karşılıklı Eşleştirir
 */
export async function pairUsersByCode(activeUsername, targetCode) {
  const normalizedActive = activeUsername.toLowerCase().trim();
  const codeToFind = targetCode.trim().toUpperCase();

  return await safeUpdateDatabase((db) => {
    if (!db.userData) throw new Error("Veritabanı bulunamadı.");

    // Kodu eşleşen partneri bul
    let matchedPartner = null;
    for (const [uname, udata] of Object.entries(db.userData)) {
      if (udata.settings?.duoCode?.toUpperCase() === codeToFind) {
        matchedPartner = uname;
        break;
      }
    }

    if (!matchedPartner) {
      throw new Error("Geçersiz Duo Kodu! Böyle bir koda sahip kullanıcı bulunamadı.");
    }

    if (matchedPartner === normalizedActive) {
      throw new Error("Kendi Duo Kodunuz ile eşleşemezsiniz!");
    }

    // Karşılıklı partner eşleştirmesi yap
    if (!db.userData[normalizedActive].settings) db.userData[normalizedActive].settings = {};
    if (!db.userData[matchedPartner].settings) db.userData[matchedPartner].settings = {};

    db.userData[normalizedActive].settings.partner = matchedPartner;
    db.userData[matchedPartner].settings.partner = normalizedActive;

    return db;
  }, `Pair users: ${normalizedActive} <-> Duo Partner`);
}

/**
 * İki Kullanıcının Duo Eşleşmesini Karşılıklı Sonlandırır
 */
export async function unpairUsers(activeUsername) {
  const normalizedActive = activeUsername.toLowerCase().trim();

  return await safeUpdateDatabase((db) => {
    const currentPartner = db.userData?.[normalizedActive]?.settings?.partner;

    if (db.userData?.[normalizedActive]?.settings) {
      db.userData[normalizedActive].settings.partner = null;
    }

    if (currentPartner && db.userData?.[currentPartner]?.settings) {
      db.userData[currentPartner].settings.partner = null;
    }

    return db;
  }, `Unpair user: ${normalizedActive}`);
}
