/**
 * FitChain - Kalistenik Takip & Kademeli Yüklenme (Progressive Overload) Motoru
 */

import { ROUTINES } from "./config.js";

/**
 * Kullanıcının Geçmiş Kayıtlarından Belirli Bir Egzersizin Son Performansını Bulur
 */
export function findLastExercisePerformance(userLogs, exerciseId, currentDateStr) {
  if (!userLogs) return null;

  const pastDates = Object.keys(userLogs)
    .filter((d) => d < currentDateStr && userLogs[d]?.workoutDetails?.exercises)
    .sort()
    .reverse();

  for (const date of pastDates) {
    const exercises = userLogs[date].workoutDetails.exercises;
    const match = exercises.find((ex) => ex.id === exerciseId);
    if (match && Array.isArray(match.sets) && match.sets.length > 0) {
      return {
        date,
        sets: match.sets,
        totalReps: match.sets.reduce((a, b) => a + (Number(b) || 0), 0)
      };
    }
  }

  return null;
}

/**
 * Seçili Rutinin Egzersiz Kartlarını Arayüze Render Eder
 */
export function renderWorkoutRoutine(containerEl, routineKey, userLogs, currentDateStr) {
  if (!containerEl) return;
  containerEl.innerHTML = "";

  const routine = ROUTINES[routineKey] || ROUTINES.A;
  const todayLog = userLogs?.[currentDateStr]?.workoutDetails;
  const isCurrentRoutineSelected = todayLog?.routine === routineKey;

  routine.exercises.forEach((ex, exIndex) => {
    const lastPerf = findLastExercisePerformance(userLogs, ex.id, currentDateStr);
    const existingSets = isCurrentRoutineSelected
      ? todayLog?.exercises?.find((e) => e.id === ex.id)?.sets || []
      : [];

    const card = document.createElement("div");
    card.className = "bg-slate-900/80 border border-slate-700/70 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3";
    card.dataset.exerciseId = ex.id;
    card.dataset.exerciseName = ex.name;

    // Kart Başlığı ve Geçmiş PR Bilgisi
    let historyBadge = "";
    if (lastPerf) {
      historyBadge = `
        <span class="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
          Önceki: <strong class="text-amber-400 font-mono">${lastPerf.sets.join(" - ")}</strong> (${lastPerf.totalReps} tkr)
        </span>
      `;
    }

    card.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div>
          <span class="text-xs font-bold text-slate-400 block">Egzersiz ${exIndex + 1}</span>
          <h4 class="text-sm sm:text-base font-extrabold text-white">${ex.name}</h4>
        </div>
        ${historyBadge}
      </div>
      <p class="text-xs text-slate-400 leading-relaxed">${ex.tip}</p>

      <!-- Set / Tekrar Giriş Alanları -->
      <div class="pt-2">
        <label class="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">Set Tekrarları</label>
        <div class="flex flex-wrap items-center gap-2" id="sets-container-${ex.id}">
          <!-- Dinamik Set Kutuları Buraya Basılır -->
        </div>
      </div>
    `;

    const setsContainer = card.querySelector(`#sets-container-${ex.id}`);
    const setCount = Math.max(ex.defaultSets, existingSets.length);

    for (let s = 0; s < setCount; s++) {
      const setInputWrapper = document.createElement("div");
      setInputWrapper.className = "flex items-center gap-1 bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:border-sky-500 transition";
      
      const prevVal = lastPerf?.sets?.[s] !== undefined ? lastPerf.sets[s] : "-";
      const currentVal = existingSets[s] !== undefined ? existingSets[s] : "";

      setInputWrapper.innerHTML = `
        <span class="text-[10px] font-bold text-slate-500 select-none">S${s + 1}</span>
        <input 
          type="number" 
          min="0" 
          max="200" 
          step="1"
          value="${currentVal}"
          placeholder="${prevVal}" 
          class="set-rep-input w-11 bg-transparent text-center text-sm font-bold text-white focus:outline-none" 
          data-set-index="${s}"
        />
      `;
      setsContainer.appendChild(setInputWrapper);
    }

    // Set Ekleme Butonu
    const addSetBtn = document.createElement("button");
    addSetBtn.type = "button";
    addSetBtn.className = "text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-xl border border-slate-700 transition";
    addSetBtn.innerText = "+ Set";
    addSetBtn.onclick = () => appendExtraSet(setsContainer, setsContainer.children.length);
    setsContainer.appendChild(addSetBtn);

    containerEl.appendChild(card);
  });
}

function appendExtraSet(container, setIndex) {
  const btn = container.lastElementChild;
  const wrapper = document.createElement("div");
  wrapper.className = "flex items-center gap-1 bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:border-sky-500 transition";
  wrapper.innerHTML = `
    <span class="text-[10px] font-bold text-slate-500 select-none">S${setIndex + 1}</span>
    <input 
      type="number" 
      min="0" 
      max="200" 
      step="1" 
      placeholder="0" 
      class="set-rep-input w-11 bg-transparent text-center text-sm font-bold text-white focus:outline-none" 
      data-set-index="${setIndex}"
    />
  `;
  container.insertBefore(wrapper, btn);
}

/**
 * Arayüzdeki Tüm Set Verilerini Toplar ve Kayıt Nesnesi Üretir
 */
export function harvestWorkoutData(containerEl, routineKey) {
  if (!containerEl) return null;

  const exerciseCards = containerEl.querySelectorAll("[data-exercise-id]");
  const exercises = [];
  let totalVolumeReps = 0;

  exerciseCards.forEach((card) => {
    const id = card.dataset.exerciseId;
    const name = card.dataset.exerciseName;
    const inputs = card.querySelectorAll(".set-rep-input");
    const sets = [];

    inputs.forEach((input) => {
      const val = parseInt(input.value, 10);
      if (!isNaN(val) && val > 0) {
        sets.push(val);
        totalVolumeReps += val;
      }
    });

    if (sets.length > 0) {
      exercises.push({ id, name, sets });
    }
  });

  return {
    routine: routineKey,
    completedAt: new Date().toISOString(),
    totalVolumeReps,
    exercises
  };
}