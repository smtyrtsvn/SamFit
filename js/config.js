/**
 * FitChain - Yapılandırma ve Sabitler
 */

export const CONFIG = {
  DB_FILE_PATH: "data/fitchain_db.json",
  STORAGE_KEYS: {
    GITHUB_CONFIG: "fitchain_gh_cfg",
    ACTIVE_USER: "fitchain_active_user",
    USER_THEME: "fitchain_user_theme"
  },
  DEFAULT_BRANCH: "main"
};

// Xiaomi Akıllı Tartı Metrik Tanımları
export const XIAOMI_METRICS = {
  weight: { label: "Kilo", unit: "kg", step: "0.1", placeholder: "örn: 81.4", required: true },
  bodyFat: { label: "Yağ Oranı", unit: "%", step: "0.1", placeholder: "örn: 18.5", required: false },
  muscleMass: { label: "Kas Kütlesi", unit: "kg", step: "0.1", placeholder: "örn: 62.8", required: false },
  waterPct: { label: "Su Oranı", unit: "%", step: "0.1", placeholder: "örn: 56.0", required: false },
  visceralFat: { label: "İç Yağlanma", unit: "Lv", step: "1", placeholder: "örn: 7", required: false }
};

// Kalistenik Antrenman Rutinleri (Progressive Overload Set Sayılarıyla)
export const ROUTINES = {
  A: {
    title: "Gün A: İtiş & Karın",
    exercises: [
      { id: "pushup", name: "Standart / Elmas Şınav", defaultSets: 4, tip: "Dirsekleri gövdeye 45 derece açıyla çekin, tepe noktasında göğsü sıkın." },
      { id: "pike", name: "Pike Push-Up (Omuz)", defaultSets: 3, tip: "Kalça yukarıda, başı ellerin önüne doğru V şeklinde indirin." },
      { id: "dips", name: "Dips / Sandalye Dips", defaultSets: 3, tip: "Gövde dik, dirsekler geriye bükülürken omuzları öne düşürmeyin." },
      { id: "hollow", name: "Hollow Body / Plank (sn)", defaultSets: 3, tip: "Bel boşluğunu tamamen yere yapıştırın, karın gergin." }
    ]
  },
  B: {
    title: "Gün B: Çekiş & Bacak",
    exercises: [
      { id: "row", name: "Masa Altı Çekiş (Australian Row)", defaultSets: 4, tip: "Kürek kemiklerini birbirine kilitleyerek göğsü masaya çekin." },
      { id: "squat", name: "Vücut Ağırlığı Squat", defaultSets: 4, tip: "Topuklar sabit, kalça geriye, dizler ayak ucu yönünde açılır." },
      { id: "split_squat", name: "Bulgarian Split Squat", defaultSets: 3, tip: "Arka ayak koltukta, öndeki bacağın topuğundan güç alın." },
      { id: "glute_bridge", name: "Glute Bridge & Calf Raise", defaultSets: 3, tip: "Tepe noktasında kalçayı 2 saniye kilitli tutun." }
    ]
  },
  C: {
    title: "Gün C: Mobilite & Aktif Dinlenme",
    exercises: [
      { id: "disloc", name: "Omuz Dislokasyonu (Havlu/Lastik)", defaultSets: 2, tip: "Kolları bükmeden önden arkaya geniş dairesel çevirin." },
      { id: "deep_squat", name: "Derin Squat Beklemesi (sn)", defaultSets: 3, tip: "Topuklar yerde, göğüs açık biçimde dinlenme pozisyonu." },
      { id: "cat_cow", name: "Kedi - Deve & Kobra Esnemesi", defaultSets: 3, tip: "Omurgayı nefesle senkronize bir şekilde dalgalandırın." }
    ]
  },
  EMERGENCY: {
    title: "🚨 Acil Durum (Sıfır Gün Yok)",
    exercises: [
      { id: "emergency_circuit", name: "20 Şınav + 20 Squat + 1 dk Plank", defaultSets: 1, tip: "Zamanın ve enerjinin bittiği günlerde zinciri kurtarma turu." }
    ]
  }
};

// Duo Dark Tema Renk Profilleri
export const USER_THEMES = {
  samet: {
    id: "samet",
    name: "Mavi",
    accent: "text-sky-400",
    bgAccent: "bg-sky-500",
    borderAccent: "border-sky-500/40",
    hoverBg: "hover:bg-sky-600",
    chartColor: "#38bdf8",
    chartBg: "rgba(56, 189, 248, 0.12)"
  },
  gulbilge: {
    id: "gulbilge",
    name: "Pembe/Mor",
    accent: "text-rose-400",
    bgAccent: "bg-gradient-to-r from-rose-500 to-fuchsia-500",
    borderAccent: "border-rose-500/40",
    hoverBg: "hover:bg-rose-600",
    chartColor: "#f43f5e",
    chartBg: "rgba(244, 63, 94, 0.12)"
  }
};