/**
 * FitChain - GitHub API & Çakışma Önleyici Veri Motoru
 */

import { CONFIG } from "./config.js";

// GitHub Ayarlarını Yerel Hafızadan Getir
export function getGithubConfig() {
  const cfg = localStorage.getItem(CONFIG.STORAGE_KEYS.GITHUB_CONFIG);
  return cfg ? JSON.parse(cfg) : null;
}

// GitHub Ayarlarını Kaydet
export function setGithubConfig(owner, repo, token) {
  const cfg = { owner: owner.trim(), repo: repo.trim(), token: token.trim() };
  localStorage.setItem(CONFIG.STORAGE_KEYS.GITHUB_CONFIG, JSON.stringify(cfg));
  return cfg;
}

// UTF-8 Uyumlu Base64 Dönüşümleri
function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64(str) {
  return decodeURIComponent(escape(atob(str)));
}

/**
 * GitHub API'den Veritabanını En Güncel SHA ile Çeker
 */
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
    // Repo içinde dosya henüz yoksa başlangıç şablonunu oluştur
    return {
      db: { accounts: {}, userData: {} },
      sha: null
    };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub verisi çekilemedi (${res.status})`);
  }

  const payload = await res.json();
  const db = JSON.parse(fromBase64(payload.content));
  return { db, sha: payload.sha };
}

/**
 * GitHub'a Yeni Commit Gönderir (SHA Eşleşmesi ile)
 */
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

/**
 * Çakışma Önleyici Güvenli Kayıt (Optimistic Concurrency Control)
 * 1. En son veritabanını ve SHA'yı çeker.
 * 2. Yalnızca hedeflenen kullanıcının verisini günceller (diğer kullanıcının verisine dokunmaz).
 * 3. Çakışma (409 Conflict) olursa otomatik olarak 3 kez baştan dener.
 */
export async function safeUpdateDatabase(mutatorFn, commitMessage = "Update FitChain data", maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      // 1. En güncel veriyi GitHub'dan çek
      const { db, sha } = await fetchRemoteDatabase();

      // 2. Veri üzerinde kullanıcı işlemini yap
      const updatedDb = mutatorFn(db);

      // 3. Yeni halini commit et
      const jsonStr = JSON.stringify(updatedDb, null, 2);
      const newSha = await pushCommit(jsonStr, commitMessage, sha);
      
      return { success: true, newSha, db: updatedDb };
    } catch (err) {
      if (err.status === 409 && attempt < maxRetries) {
        // Çakışma algılandı: 800ms bekle ve tekrar dene
        await new Promise((r) => setTimeout(r, 800 * attempt));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Veri çakışması 3 denemeden sonra çözülemedi. Lütfen tekrar deneyin.");
}

/**
 * Aktif Kullanıcının Günlük Verisini Güvenle Kaydeder
 */
export async function saveUserDailyLog(username, dateStr, dayPatch) {
  const normalizedUser = username.toLowerCase().trim();
  const commitMsg = `Log data for ${normalizedUser} on ${dateStr}`;

  return await safeUpdateDatabase((db) => {
    if (!db.userData) db.userData = {};
    if (!db.userData[normalizedUser]) {
      db.userData[normalizedUser] = { settings: { startWeight: null }, logs: {} };
    }
    if (!db.userData[normalizedUser].logs) {
      db.userData[normalizedUser].logs = {};
    }

    const currentLog = db.userData[normalizedUser].logs[dateStr] || {};

    // Eski veriyi koru, gelen yamayı (patch) üzerine ekle
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

    // İlk kilo girildiyse başlangıç kilosu olarak işaretle
    if (dayPatch.metrics?.weight && !db.userData[normalizedUser].settings?.startWeight) {
      db.userData[normalizedUser].settings.startWeight = dayPatch.metrics.weight;
    }

    return db;
  }, commitMsg);
}

/**
 * Yeni Kullanıcıyı Diğer Kullanıcıları Silmeden Güvenle Ekler
 */
export async function registerNewUser(username, passwordHash) {
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
        settings: { startWeight: null },
        logs: {}
      };
    }

    return db;
  }, `Register new user: ${normalizedUser}`);
}