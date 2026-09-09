/**
 * FitChain - Xiaomi Çoklu Metrik & 7 Günlük SMA Trend Grafiği
 */

import { USER_THEMES } from "./config.js";

let chartInstance = null;

/**
 * Belirli Bir Metrik İçin 7 Günlük Basit Hareketli Ortalama (SMA) Hesaplar
 */
export function calculate7DaySMA(userLogs, metricKey, targetDate) {
  let sum = 0;
  let count = 0;

  for (let j = 0; j < 7; j++) {
    const prev = new Date(targetDate);
    prev.setDate(prev.getDate() - j);
    const pStr = prev.toISOString().split("T")[0];
    const val = parseFloat(userLogs?.[pStr]?.metrics?.[metricKey]);

    if (!isNaN(val) && val > 0) {
      sum += val;
      count++;
    }
  }

  return count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
}

/**
 * Son 30 Günün Verilerini Chart.js Formatına Dönüştürür
 */
export function prepareChartData(userLogs, userThemeId = "samet") {
  const labels = [];
  const rawWeights = [];
  const smaWeights = [];
  const bodyFatPcts = [];
  const muscleMasses = [];

  const theme = USER_THEMES[userThemeId] || USER_THEMES.samet;

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split("T")[0];

    labels.push(`${d.getDate()}/${d.getMonth() + 1}`);

    const log = userLogs?.[dStr]?.metrics || {};
    const w = parseFloat(log.weight) || null;
    const bf = parseFloat(log.bodyFat) || null;
    const mm = parseFloat(log.muscleMass) || null;

    rawWeights.push(w);
    smaWeights.push(calculate7DaySMA(userLogs, "weight", d));
    bodyFatPcts.push(bf);
    muscleMasses.push(mm);
  }

  return {
    labels,
    datasets: [
      {
        label: "Kilo Trendi (7 Günlük SMA)",
        data: smaWeights,
        borderColor: theme.chartColor,
        backgroundColor: theme.chartBg,
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        yAxisID: "yWeight",
        spanGaps: true
      },
      {
        label: "Günlük Tartım (kg)",
        data: rawWeights,
        borderColor: "rgba(148, 163, 184, 0.4)",
        borderWidth: 1.5,
        pointRadius: 2,
        borderDash: [3, 3],
        fill: false,
        yAxisID: "yWeight",
        spanGaps: true
      },
      {
        label: "Yağ Oranı (%) - Xiaomi",
        data: bodyFatPcts,
        borderColor: "#f59e0b",
        borderWidth: 2,
        pointRadius: 3,
        fill: false,
        yAxisID: "yFat",
        spanGaps: true
      },
      {
        label: "Kas Kütlesi (kg) - Xiaomi",
        data: muscleMasses,
        borderColor: "#10b981",
        borderWidth: 1.5,
        pointRadius: 2,
        borderDash: [2, 2],
        fill: false,
        yAxisID: "yWeight",
        spanGaps: true
      }
    ]
  };
}

/**
 * Grafiği Başlatır veya Günceller
 */
export function renderTrendChart(canvasEl, userLogs, userThemeId = "samet") {
  if (!canvasEl) return;

  const data = prepareChartData(userLogs, userThemeId);

  if (chartInstance) {
    chartInstance.data = data;
    chartInstance.update();
    return;
  }

  const ctx = canvasEl.getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "line",
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      scales: {
        x: {
          grid: { color: "#1e293b" },
          ticks: { color: "#94a3b8", font: { size: 10 } }
        },
        yWeight: {
          type: "linear",
          position: "left",
          grid: { color: "#334155" },
          ticks: {
            color: "#94a3b8",
            font: { size: 10 },
            callback: (v) => `${v} kg`
          }
        },
        yFat: {
          type: "linear",
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: {
            color: "#f59e0b",
            font: { size: 10 },
            callback: (v) => `%${v}`
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: "#e2e8f0",
            boxWidth: 12,
            font: { size: 11 }
          }
        }
      }
    }
  });
}

/**
 * 1-2-3 Aylık Değişim Projeksiyon Kartlarını Günceller
 */
export function updateMilestoneProjections(containerCards, userLogs, settings) {
  if (!containerCards) return;

  // Başlangıç kilo ve yağ oranını belirle
  const startWeight = settings?.startWeight;
  
  // İlk girilen geçerli yağ oranını bul
  let startFat = null;
  if (userLogs) {
    const dates = Object.keys(userLogs).sort();
    for (const d of dates) {
      if (userLogs[d]?.metrics?.bodyFat) {
        startFat = parseFloat(userLogs[d].metrics.bodyFat);
        break;
      }
    }
  }

  const c1 = containerCards.month1;
  const c2 = containerCards.month2;
  const c3 = containerCards.month3;

  if (!startWeight) {
    if (c1) c1.innerHTML = `<span class="text-slate-500 text-sm">İlk tartımı giriniz</span>`;
    if (c2) c2.innerHTML = `<span class="text-slate-500 text-sm">-</span>`;
    if (c3) c3.innerHTML = `<span class="text-slate-500 text-sm">-</span>`;
    return;
  }

  // Sağlıklı tempo: Ayda ~2 kg yağ kaybı ve ~%1-1.5 yağ oranı düşüşü
  const p1Kg = (startWeight - 2.0).toFixed(1);
  const p2Kg = (startWeight - 4.2).toFixed(1);
  const p3Kg = (startWeight - 6.2).toFixed(1);

  const fatP1 = startFat ? ` | %${(startFat - 1.2).toFixed(1)}` : "";
  const fatP2 = startFat ? ` | %${(startFat - 2.5).toFixed(1)}` : "";
  const fatP3 = startFat ? ` | %${(startFat - 3.8).toFixed(1)}` : "";

  if (c1) c1.innerHTML = `<span class="text-xl font-black text-emerald-400">~ ${p1Kg} kg</span><span class="text-xs text-amber-400/80 font-bold ml-1">${fatP1}</span>`;
  if (c2) c2.innerHTML = `<span class="text-xl font-black text-emerald-400">~ ${p2Kg} kg</span><span class="text-xs text-amber-400/80 font-bold ml-1">${fatP2}</span>`;
  if (c3) c3.innerHTML = `<span class="text-xl font-black text-emerald-400">~ ${p3Kg} kg</span><span class="text-xs text-amber-400/80 font-bold ml-1">${fatP3}</span>`;
}