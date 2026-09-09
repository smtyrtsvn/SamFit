/**
 * FitChain - Duo Ortak Motivasyon & Dinamik Kod Eşleştirme Motoru
 */

import { USER_THEMES } from "./config.js";

export function calculateUserStreak(userLogs) {
  if (!userLogs) return 0;
  let streak = 0;
  let check = new Date();

  while (true) {
    const dStr = check.toISOString().split("T")[0];
    const log = userLogs[dStr];
    const hasActivity = log && (log.metrics?.weight || log.habits?.workoutCompleted);

    if (hasActivity) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      const todayStr = new Date().toISOString().split("T")[0];
      if (dStr === todayStr && streak === 0) {
        check.setDate(check.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}

export function calculateDuoStreak(db, userA, userB) {
  if (!userA || !userB) return 0;
  const logsA = db?.userData?.[userA]?.logs || {};
  const logsB = db?.userData?.[userB]?.logs || {};

  let duoStreak = 0;
  let check = new Date();

  while (true) {
    const dStr = check.toISOString().split("T")[0];
    const actA = logsA[dStr] && (logsA[dStr].metrics?.weight || logsA[dStr].habits?.workoutCompleted);
    const actB = logsB[dStr] && (logsB[dStr].metrics?.weight || logsB[dStr].habits?.workoutCompleted);

    if (actA && actB) {
      duoStreak++;
      check.setDate(check.getDate() - 1);
    } else {
      const todayStr = new Date().toISOString().split("T")[0];
      if (dStr === todayStr && duoStreak === 0) {
        check.setDate(check.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return duoStreak;
}

export function getWeeklyStats(userLogs) {
  let workouts = 0;
  let weighIns = 0;
  let totalWater = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split("T")[0];
    const log = userLogs?.[dStr];

    if (log?.habits?.workoutCompleted) workouts++;
    if (log?.metrics?.weight) weighIns++;
    if (log?.habits?.waterGlasses) totalWater += log.habits.waterGlasses;
  }

  return { workouts, weighIns, totalWaterLiters: (totalWater * 0.25).toFixed(1) };
}

/**
 * Duo Ekranını Render Eder (Eşleşme Varsa Paneli, Yoksa Eşleştirme Formunu Gösterir)
 */
export function renderDuoDashboard(containerEl, db, activeUser) {
  if (!containerEl || !db?.userData || !activeUser) return;

  const userData = db.userData[activeUser] || {};
  const settings = userData.settings || {};
  const duoCode = settings.duoCode || "KOD-YOK";
  const partner = settings.partner;

  // DURUM 1: HENÜZ BİR EŞLEŞME YOKSA (EŞLEŞTİRME EKRANI)
  if (!partner || !db.userData[partner]) {
    containerEl.innerHTML = `
      <div class="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 text-center max-w-lg mx-auto">
        <div class="space-y-2">
          <span class="text-4xl">🔗</span>
          <h2 class="text-xl font-black text-white">Duo Partnerini Bağla</h2>
          <p class="text-xs text-slate-400">
            Eşiniz veya arkadaşınızla birbirinizin zincirini görmek ve ortak ateş yakmak için eşleşin.
          </p>
        </div>

        <!-- Kullanıcının Kendi Kodu -->
        <div class="bg-slate-900/90 border border-slate-700/80 p-4 rounded-2xl space-y-2">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Senin Duo Kodun</span>
          <div class="flex items-center justify-center gap-2">
            <span id="displayDuoCode" class="text-xl sm:text-2xl font-black tracking-widest text-sky-400 font-mono select-all">
              ${duoCode}
            </span>
            <button type="button" id="btnCopyDuoCode" title="Kodu Kopyala" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold transition">
              Kopyala 📋
            </button>
          </div>
          <p class="text-[10px] text-slate-500">Bu kodu partnerinize iletin, kendi ekranından giriş yapsın.</p>
        </div>

        <div class="flex items-center gap-3 my-2">
          <div class="h-px bg-slate-800 flex-1"></div>
          <span class="text-xs font-bold text-slate-500 uppercase">VEYA</span>
          <div class="h-px bg-slate-800 flex-1"></div>
        </div>

        <!-- Partnerin Kodunu Girme Alanı -->
        <form id="pairDuoForm" class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1.5 text-left">Partnerinin Duo Kodu</label>
            <input 
              type="text" 
              id="inputPartnerCode" 
              required 
              placeholder="örn: DUO-GUL-8492" 
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-center font-mono font-bold uppercase text-white focus:outline-none focus:border-rose-500 transition" 
            />
          </div>
          <button type="submit" id="btnSubmitPair" class="w-full bg-gradient-to-r from-sky-500 to-rose-500 hover:opacity-95 text-white font-black py-3 rounded-xl text-sm transition shadow-lg">
            Eşleş ve Duo'yu Başlat 🚀
          </button>
        </form>
      </div>
    `;
    return;
  }

  // DURUM 2: EŞLEŞME VARSA (ORTAK MOTİVASYON PANELİ)
  const userA = activeUser;
  const userB = partner;

  const streakA = calculateUserStreak(db.userData[userA]?.logs);
  const streakB = calculateUserStreak(db.userData[userB]?.logs);
  const duoStreak = calculateDuoStreak(db, userA, userB);

  const statsA = getWeeklyStats(db.userData[userA]?.logs);
  const statsB = getWeeklyStats(db.userData[userB]?.logs);

  const themeIdA = db.userData[userA]?.settings?.theme || "blue";
  const themeIdB = db.userData[userB]?.settings?.theme || "pink";

  containerEl.innerHTML = `
    <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-6">
      
      <!-- Duo Streak Başlığı -->
      <div class="text-center relative z-10 space-y-1">
        <span class="text-xs uppercase font-extrabold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-purple-400 to-rose-400">
          Duo Zinciri & Ortak Disiplin
        </span>
        <div class="flex items-center justify-center gap-2 pt-1">
          <span class="text-3xl sm:text-4xl animate-pulse">🔥</span>
          <span class="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-rose-400">
            ${duoStreak}
          </span>
          <span class="text-xs font-bold text-slate-400 self-end mb-1">GÜN ORTAK</span>
        </div>
        <p class="text-[11px] text-slate-400 max-w-xs mx-auto pt-1">
          ${duoStreak > 0 
            ? "Her ikiniz de zinciri kırmadan devam ediyorsunuz! Harika bir takım çalışması." 
            : "Bugün her ikiniz de kaydınızı tamamladığında ortak ateş yanacak."}
        </p>
      </div>

      <!-- İki Profil Kıyaslama Kartları -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 relative z-10">
        
        <!-- Aktif Kullanıcı (Sen) -->
        <div class="bg-slate-900/90 border border-sky-400 ring-1 ring-sky-400/40 p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="font-extrabold text-sm text-sky-400 uppercase tracking-wide">${userA} (Sen)</span>
              <span class="text-xs bg-sky-950 text-sky-300 font-bold px-2 py-0.5 rounded-full border border-sky-800">
                ${streakA} Gün 🔥
              </span>
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">Son 7 Günlük Performans</div>
          </div>

          <div class="space-y-1.5 mt-3 text-xs">
            <div class="flex justify-between text-slate-300">
              <span class="text-slate-500">Antrenman:</span>
              <span class="font-bold text-slate-200">${statsA.workouts} / 7</span>
            </div>
            <div class="flex justify-between text-slate-300">
              <span class="text-slate-500">Tartım:</span>
              <span class="font-bold text-slate-200">${statsA.weighIns} gün</span>
            </div>
            <div class="flex justify-between text-slate-300">
              <span class="text-slate-500">Su:</span>
              <span class="font-bold text-sky-300">${statsA.totalWaterLiters} L</span>
            </div>
          </div>
        </div>

        <!-- Partner -->
        <div class="bg-slate-900/90 border border-rose-400 ring-1 ring-rose-400/40 p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="font-extrabold text-sm text-rose-400 uppercase tracking-wide">${userB}</span>
              <span class="text-xs bg-rose-950 text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-800">
                ${streakB} Gün 🔥
              </span>
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">Son 7 Günlük Performans</div>
          </div>

          <div class="space-y-1.5 mt-3 text-xs">
            <div class="flex justify-between text-slate-300">
              <span class="text-slate-500">Antrenman:</span>
              <span class="font-bold text-slate-200">${statsB.workouts} / 7</span>
            </div>
            <div class="flex justify-between text-slate-300">
              <span class="text-slate-500">Tartım:</span>
              <span class="font-bold text-slate-200">${statsB.weighIns} gün</span>
            </div>
            <div class="flex justify-between text-slate-300">
              <span class="text-slate-500">Su:</span>
              <span class="font-bold text-rose-300">${statsB.totalWaterLiters} L</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Alt Bar: Duo Kodu ve Eşleşmeyi Sonlandır -->
      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
        <span>Kodun: <strong class="font-mono text-slate-200">${duoCode}</strong></span>
        <button type="button" id="btnUnpairDuo" class="text-rose-400 hover:text-rose-300 hover:underline transition">
          Eşleşmeyi Sonlandır
        </button>
      </div>

    </div>
  `;
}
