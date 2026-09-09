/**
 * FitChain - Ana Orkestrasyon & Uygulama Yaşam Döngüsü
 */

import { CONFIG, ROUTINES, USER_THEMES } from "./config.js";
import {
  getGithubConfig,
  setGithubConfig,
  fetchRemoteDatabase,
  saveUserDailyLog,
  registerNewUser
} from "./api.js";
import {
  hashPassword,
  getActiveUser,
  setActiveUserSession,
  logoutUserSession,
  verifyCredentials,
  applyUserTheme
} from "./auth.js";
import {
  renderWorkoutRoutine,
  harvestWorkoutData
} from "./workout.js";
import {
  calculateUserStreak,
  renderDuoDashboard
} from "./duo.js";
import {
  renderTrendChart,
  updateMilestoneProjections
} from "./chart.js";

// ============================================================================
// UYGULAMA DURUMU (APPLICATION STATE)
// ============================================================================
let currentDb = null;
let activeUser = null;
let currentDate = new Date().toISOString().split("T")[0];
let currentTab = "today";
let authMode = "login";

// ============================================================================
// YARDIMCI VE BİLDİRİM FONKSİYONLARI
// ============================================================================
function showSync(text = "GitHub ile senkronize ediliyor...") {
  const el = document.getElementById("syncIndicator");
  const txt = document.getElementById("syncText");
  if (txt) txt.innerText = text;
  if (el) el.classList.remove("opacity-0", "pointer-events-none");
}

function hideSync() {
  const el = document.getElementById("syncIndicator");
  if (el) el.classList.add("opacity-0", "pointer-events-none");
}

function getActiveUserLogs() {
  if (!currentDb?.userData || !activeUser) return {};
  return currentDb.userData[activeUser]?.logs || {};
}

function getActiveUserSettings() {
  if (!currentDb?.userData || !activeUser) return {};
  return currentDb.userData[activeUser]?.settings || {};
}

// ============================================================================
// SEKME YÖNETİMİ (TAB ROUTER)
// ============================================================================
function switchTab(targetTab) {
  currentTab = targetTab;
  const tabs = ["today", "workout", "diet", "duo", "progress"];

  tabs.forEach((tab) => {
    const sec = document.getElementById(`tab-${tab}`);
    const btn = document.getElementById(`tab-btn-${tab}`);
    if (!sec || !btn) return;

    if (tab === targetTab) {
      sec.classList.remove("hidden");
      btn.classList.add("theme-accent-bg", "text-white");
      btn.classList.remove("text-slate-400");
    } else {
      sec.classList.add("hidden");
      btn.classList.remove("theme-accent-bg", "text-white");
      btn.classList.add("text-slate-400");
    }
  });

  // Sekmeye özel dinamik içerik güncellemeleri
  if (targetTab === "workout") {
    refreshWorkoutTab();
  } else if (targetTab === "duo") {
    refreshDuoTab();
  } else if (targetTab === "progress") {
    refreshProgressTab();
  }
}

// ============================================================================
// GÜNLÜK VERİ & XIAOMI TARTI YÜKLEME / KAYDETME
// ============================================================================
function loadDayData(dateStr) {
  const logs = getActiveUserLogs();
  const log = logs[dateStr] || {};
  const metrics = log.metrics || {};
  const habits = log.habits || {};

  // Xiaomi Metrik Girişleri
  document.getElementById("metricWeight").value = metrics.weight || "";
  document.getElementById("metricBodyFat").value = metrics.bodyFat || "";
  document.getElementById("metricMuscleMass").value = metrics.muscleMass || "";
  document.getElementById("metricWaterPct").value = metrics.waterPct || "";
  document.getElementById("metricVisceralFat").value = metrics.visceralFat || "";

  // Alışkanlık Onayları
  document.getElementById("checkWorkout").checked = !!habits.workoutCompleted;
  document.getElementById("checkDiet").checked = !!habits.dietCompleted;

  // Su ve Notlar
  document.getElementById("waterGlassCount").innerText = habits.waterGlasses || 0;
  document.getElementById("dietNotes").value = log.notes || "";

  updateStatusBanner(log);
  renderMiniChain();
}

function updateStatusBanner(log) {
  const banner = document.getElementById("chainStatusBanner");
  if (!banner) return;

  const hasWeight = !!log?.metrics?.weight;
  const hasWorkout = !!log?.habits?.workoutCompleted;
  const hasDiet = !!log?.habits?.dietCompleted;

  if (hasWeight && hasWorkout && hasDiet) {
    banner.className = "p-3.5 rounded-2xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-center text-xs sm:text-sm font-bold";
    banner.innerText = "✨ Mükemmel! Bugünün zincir hedefleri eksiksiz tamamlandı.";
  } else if (hasWeight || hasWorkout) {
    banner.className = "p-3.5 rounded-2xl border border-sky-500/40 bg-sky-500/10 text-sky-300 text-center text-xs sm:text-sm font-semibold";
    banner.innerText = "⚡ Zincir aktif durumda! Kalan alışkanlıkları tamamlayarak günü mühürleyin.";
  } else {
    banner.className = "p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-center text-xs sm:text-sm font-medium";
    banner.innerText = "⏳ Zincirin kopmaması için bugün en az bir antrenman veya tartım girin.";
  }
}

async function handleSaveMetrics() {
  const w = parseFloat(document.getElementById("metricWeight").value);
  if (isNaN(w) || w <= 0) {
    alert("Lütfen geçerli bir ağırlık (kg) değeri girin.");
    return;
  }

  const bf = parseFloat(document.getElementById("metricBodyFat").value);
  const mm = parseFloat(document.getElementById("metricMuscleMass").value);
  const wp = parseFloat(document.getElementById("metricWaterPct").value);
  const vf = parseInt(document.getElementById("metricVisceralFat").value, 10);

  const metricsPatch = {
    weight: w,
    bodyFat: !isNaN(bf) && bf > 0 ? bf : null,
    muscleMass: !isNaN(mm) && mm > 0 ? mm : null,
    waterPct: !isNaN(wp) && wp > 0 ? wp : null,
    visceralFat: !isNaN(vf) && vf > 0 ? vf : null
  };

  showSync("Xiaomi verileri GitHub'a kaydediliyor...");
  try {
    const result = await saveUserDailyLog(activeUser, currentDate, { metrics: metricsPatch });
    currentDb = result.db;
    hideSync();
    updateAllViews();
    alert("Akıllı tartı verileri başarıyla GitHub reponuza commit edildi!");
  } catch (err) {
    hideSync();
    alert("Kaydetme hatası: " + err.message);
  }
}

async function handleHabitToggle() {
  const workoutCompleted = document.getElementById("checkWorkout").checked;
  const dietCompleted = document.getElementById("checkDiet").checked;

  showSync("Alışkanlıklar senkronize ediliyor...");
  try {
    const result = await saveUserDailyLog(activeUser, currentDate, {
      habits: { workoutCompleted, dietCompleted }
    });
    currentDb = result.db;
    hideSync();
    updateAllViews();
  } catch (err) {
    hideSync();
    alert("Güncelleme hatası: " + err.message);
  }
}

async function handleWaterChange(delta) {
  const logs = getActiveUserLogs();
  const currentGlasses = logs[currentDate]?.habits?.waterGlasses || 0;
  const newCount = Math.max(0, currentGlasses + delta);

  document.getElementById("waterGlassCount").innerText = newCount;

  try {
    const result = await saveUserDailyLog(activeUser, currentDate, {
      habits: { waterGlasses: newCount }
    });
    currentDb = result.db;
  } catch (err) {
    console.error("Su güncellenemedi:", err);
  }
}

async function handleSaveDietNotes() {
  const notes = document.getElementById("dietNotes").value;
  showSync("Beslenme notu kaydediliyor...");
  try {
    const result = await saveUserDailyLog(activeUser, currentDate, { notes });
    currentDb = result.db;
    hideSync();
    alert("Beslenme notu GitHub'a mühürlendi.");
  } catch (err) {
    hideSync();
    alert("Hata: " + err.message);
  }
}

// ============================================================================
// KALİSTENİK ANTRENMAN MOTORU ETKİLEŞİMLERİ
// ============================================================================
function refreshWorkoutTab() {
  const select = document.getElementById("routineSelect");
  const container = document.getElementById("routineCardsContainer");
  const routineKey = select ? select.value : "A";
  renderWorkoutRoutine(container, routineKey, getActiveUserLogs(), currentDate);
}

async function handleSaveWorkout() {
  const select = document.getElementById("routineSelect");
  const container = document.getElementById("routineCardsContainer");
  const routineKey = select ? select.value : "A";

  const workoutPayload = harvestWorkoutData(container, routineKey);
  if (!workoutPayload || workoutPayload.exercises.length === 0) {
    alert("Lütfen en az bir egzersiz için set tekrarı girin.");
    return;
  }

  showSync("Antrenman performansı kaydediliyor...");
  try {
    const result = await saveUserDailyLog(activeUser, currentDate, {
      workoutDetails: workoutPayload,
      habits: { workoutCompleted: true }
    });
    currentDb = result.db;
    hideSync();

    document.getElementById("checkWorkout").checked = true;
    updateAllViews();
    alert(`Tebrikler! ${workoutPayload.totalVolumeReps} tekrarlık hacim başarıyla kaydedildi.`);
    switchTab("today");
  } catch (err) {
    hideSync();
    alert("Antrenman kaydetme hatası: " + err.message);
  }
}

// ============================================================================
// GÖRSEL BİLEŞENLERİ YENİLEME
// ============================================================================
function updateAllViews() {
  const logs = getActiveUserLogs();
  const streak = calculateUserStreak(logs);
  
  const streakEl = document.getElementById("streakCount");
  if (streakEl) streakEl.innerText = streak;

  loadDayData(currentDate);

  if (currentTab === "duo") refreshDuoTab();
  if (currentTab === "progress") refreshProgressTab();
}

function renderMiniChain() {
  const container = document.getElementById("miniChainGrid");
  if (!container) return;
  container.innerHTML = "";

  const logs = getActiveUserLogs();

  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split("T")[0];
    const log = logs[dStr];

    const isComplete = log && (log.habits?.workoutCompleted || log.metrics?.weight);

    const cell = document.createElement("div");
    cell.className = `p-2 rounded-xl border text-xs flex flex-col items-center justify-center transition ${
      isComplete
        ? "bg-sky-500/20 border-sky-500 text-sky-300 font-extrabold shadow-sm"
        : "bg-slate-900 border-slate-800 text-slate-500"
    }`;
    cell.innerHTML = `
      <span>${d.getDate()}/${d.getMonth() + 1}</span>
      <span class="mt-0.5 text-sm">${isComplete ? "✓" : "·"}</span>
    `;
    container.appendChild(cell);
  }
}

function refreshDuoTab() {
  const container = document.getElementById("duoDashboardContainer");
  renderDuoDashboard(container, currentDb, "samet", "gulbilge", activeUser);
}

function refreshProgressTab() {
  const canvas = document.getElementById("weightChart");
  renderTrendChart(canvas, getActiveUserLogs(), activeUser);

  const containerCards = {
    month1: document.getElementById("cardMonth1"),
    month2: document.getElementById("cardMonth2"),
    month3: document.getElementById("cardMonth3")
  };
  updateMilestoneProjections(containerCards, getActiveUserLogs(), getActiveUserSettings());
}

// ============================================================================
// AUTH & OTURUM YÖNETİMİ
// ============================================================================
function toggleAuthMode(mode) {
  authMode = mode;
  const loginBtn = document.getElementById("authTabLogin");
  const regBtn = document.getElementById("authTabRegister");
  const submitBtn = document.getElementById("authSubmitBtn");
  const err = document.getElementById("authError");
  if (err) err.classList.add("hidden");

  if (mode === "login") {
    loginBtn.className = "py-2.5 rounded-xl bg-slate-800 text-white shadow transition";
    regBtn.className = "py-2.5 rounded-xl text-slate-400 hover:text-white transition";
    submitBtn.innerText = "Hesaba Giriş Yap";
  } else {
    regBtn.className = "py-2.5 rounded-xl bg-slate-800 text-white shadow transition";
    loginBtn.className = "py-2.5 rounded-xl text-slate-400 hover:text-white transition";
    submitBtn.innerText = "Profili Kaydet ve Başla";
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const username = document.getElementById("authUsername").value.trim().toLowerCase();
  const password = document.getElementById("authPassword").value;
  const err = document.getElementById("authError");
  if (err) err.classList.add("hidden");

  if (!username || !password) return;

  if (!currentDb) {
    showSync("Veritabanı alınıyor...");
    const res = await fetchRemoteDatabase();
    currentDb = res.db;
    hideSync();
  }

  if (authMode === "register") {
    showSync("Yeni profil oluşturuluyor...");
    try {
      const hash = await hashPassword(password);
      const res = await registerNewUser(username, hash);
      currentDb = res.db;
      hideSync();
      login(username);
    } catch (error) {
      hideSync();
      if (err) {
        err.innerText = error.message;
        err.classList.remove("hidden");
      }
    }
  } else {
    const verify = await verifyCredentials(username, password, currentDb?.accounts);
    if (!verify.success) {
      if (err) {
        err.innerText = verify.message;
        err.classList.remove("hidden");
      }
      return;
    }
    login(username);
  }
}

function login(username) {
  activeUser = setActiveUserSession(username);
  document.getElementById("authModal").classList.add("hidden");
  document.getElementById("authPassword").value = "";

  const userLabel = document.getElementById("activeUserLabel");
  if (userLabel) userLabel.innerText = `Profil: ${username.toUpperCase()}`;

  applyUserTheme(username);
  updateAllViews();
  switchTab("today");
}

function logout() {
  logoutUserSession();
  activeUser = null;
  document.getElementById("authModal").classList.remove("hidden");
  document.getElementById("authUsername").value = "";
  document.getElementById("authPassword").value = "";
}

// ============================================================================
// GITHUB YAPILANDIRMA MODAL İŞLEMLERİ
// ============================================================================
function openGithubSettings() {
  const cfg = getGithubConfig();
  if (cfg) {
    document.getElementById("cfgOwner").value = cfg.owner;
    document.getElementById("cfgRepo").value = cfg.repo;
    document.getElementById("cfgToken").value = cfg.token;
  }
  document.getElementById("githubConfigModal").classList.remove("hidden");
}

async function handleGithubConfigSubmit(e) {
  e.preventDefault();
  const owner = document.getElementById("cfgOwner").value;
  const repo = document.getElementById("cfgRepo").value;
  const token = document.getElementById("cfgToken").value;

  setGithubConfig(owner, repo, token);
  document.getElementById("githubConfigModal").classList.add("hidden");

  showSync("GitHub bağlantısı test ediliyor...");
  try {
    const res = await fetchRemoteDatabase();
    currentDb = res.db;
    hideSync();
    checkExistingSession();
  } catch (err) {
    hideSync();
    alert("Bağlantı doğrulanamadı: " + err.message);
    document.getElementById("githubConfigModal").classList.remove("hidden");
  }
}

function checkExistingSession() {
  const savedUser = getActiveUser();
  if (savedUser && currentDb?.accounts?.[savedUser]) {
    login(savedUser);
  } else {
    document.getElementById("authModal").classList.remove("hidden");
  }
}

// ============================================================================
// OLAY DİNLEYİCİLERİ VE BAŞLATMA (INIT)
// ============================================================================
window.addEventListener("DOMContentLoaded", async () => {
  // Tarih alanını bugüne ayarla
  const dateInput = document.getElementById("selectedDate");
  if (dateInput) {
    dateInput.value = currentDate;
    dateInput.addEventListener("change", (e) => {
      currentDate = e.target.value;
      loadDayData(currentDate);
      if (currentTab === "workout") refreshWorkoutTab();
    });
  }

  // Sekme Butonları
  document.getElementById("tab-btn-today")?.addEventListener("click", () => switchTab("today"));
  document.getElementById("tab-btn-workout")?.addEventListener("click", () => switchTab("workout"));
  document.getElementById("tab-btn-diet")?.addEventListener("click", () => switchTab("diet"));
  document.getElementById("tab-btn-duo")?.addEventListener("click", () => switchTab("duo"));
  document.getElementById("tab-btn-progress")?.addEventListener("click", () => switchTab("progress"));

  // Auth Modal Olayları
  document.getElementById("authTabLogin")?.addEventListener("click", () => toggleAuthMode("login"));
  document.getElementById("authTabRegister")?.addEventListener("click", () => toggleAuthMode("register"));
  document.getElementById("authForm")?.addEventListener("submit", handleAuthSubmit);
  document.getElementById("btnLogout")?.addEventListener("click", logout);

  // GitHub Config Modal Olayları
  document.getElementById("githubConfigForm")?.addEventListener("submit", handleGithubConfigSubmit);
  document.getElementById("btnOpenSettings")?.addEventListener("click", openGithubSettings);

  // Bugün Sekmesi Kayıt Butonları & Kutuları
  document.getElementById("btnSaveMetrics")?.addEventListener("click", handleSaveMetrics);
  document.getElementById("checkWorkout")?.addEventListener("change", handleHabitToggle);
  document.getElementById("checkDiet")?.addEventListener("change", handleHabitToggle);

  // Antrenman Sekmesi
  document.getElementById("routineSelect")?.addEventListener("change", refreshWorkoutTab);
  document.getElementById("btnSaveWorkout")?.addEventListener("click", handleSaveWorkout);

  // Beslenme Sekmesi
  document.getElementById("btnWaterMinus")?.addEventListener("click", () => handleWaterChange(-1));
  document.getElementById("btnWaterPlus")?.addEventListener("click", () => handleWaterChange(1));
  document.getElementById("btnSaveDiet")?.addEventListener("click", handleSaveDietNotes);

  // Başlangıç Kontrolü
  const cfg = getGithubConfig();
  if (!cfg) {
    document.getElementById("githubConfigModal").classList.remove("hidden");
  } else {
    showSync("FitChain başlatılıyor...");
    try {
      const res = await fetchRemoteDatabase();
      currentDb = res.db;
      hideSync();
      checkExistingSession();
    } catch (err) {
      hideSync();
      console.warn("Otomatik bağlantı başarısız, ayarlar açılıyor:", err);
      openGithubSettings();
    }
  }
});