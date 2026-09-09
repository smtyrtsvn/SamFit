/**
 * FitChain - Duo Ortak Motivasyon & Çift Zinciri (Duo Streak) Motoru
 */

import { USER_THEMES } from "./config.js";

/**
 * Tek Bir Kullanıcının Bireysel Zincirini (Streak) Hesaplar
 */
export function calculateUserStreak(userLogs) {
  if (!userLogs) return 0;
  let streak = 0;
  let check = new Date();

  while (true) {
    const dStr = check.toISOString().split("T")[0];
    const log = userLogs[dStr];
    
    // Zincir kuralı: Kilo tartımı VEYA egzersiz yapılmış olmalı
    const hasActivity = log && (log.metrics?.weight || log.habits?.workoutCompleted);

    if (hasActivity) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      // Eğer bugün henüz yapılmadıysa ama dün yapıldıysa zincir henüz kırılmamıştır
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

/**
 * İki Kullanıcının Aynı Gün Hedef Tamamladığı Ortak Zinciri (Duo Streak) Hesaplar
 */
export function calculateDuoStreak(db, userA = "samet", userB = "gulbilge") {
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

/**
 * Son 7 Günün Alışkanlık İstatistiklerini Çıkarır
 */
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
 * Duo Ortak Motivasyon Kartını Arayüze Render Eder
 */
export function renderDuoDashboard(containerEl, db, userA = "samet", userB = "gulbilge", activeUser) {
  if (!containerEl || !db?.userData) return;

  const streakA = calculateUserStreak(db.userData[userA]?.logs);
  const streakB = calculateUserStreak(db.userData[userB]?.logs);
  const duoStreak = calculateDuoStreak(db, userA, userB);

  const statsA = getWeeklyStats(db.userData[userA]?.logs);
  const statsB = getWeeklyStats(db.userData[userB]?.logs);

  const themeA = USER_THEMES[userA] || USER_THEMES.samet;
  const themeB = USER_THEMES[userB] || USER_THEMES.gulbilge;

  containerEl.innerHTML = `
    <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      
      <!-- Arka Plan Gradyan Efektleri -->
      <div class="absolute -top-12 -left-12 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>
      <div class="absolute -bottom-12 -right-12 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>

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
            ? "İkiniz de zinciri kırmadan devam ediyorsunuz! Harika bir takım çalışması." 
            : "Bugün her ikiniz de kaydınızı tamamladığında ortak ateş yanacak."}
        </p>
      </div>

      <!-- İki Profil Kıyaslama Kartları -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 mt-6 relative z-10">
        
        <!-- Kullanıcı A (Mavi Vurgular) -->
        <div class="bg-slate-900/80 border ${activeUser === userA ? "border-sky-400 ring-1 ring-sky-400/40" : "border-slate-700/60"} p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="font-extrabold text-sm text-sky-400 uppercase tracking-wide">${userA}</span>
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

        <!-- Kullanıcı B (Pembe/Mor Vurgular) -->
        <div class="bg-slate-900/80 border ${activeUser === userB ? "border-rose-400 ring-1 ring-rose-400/40" : "border-slate-700/60"} p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
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
    </div>
  `;
}