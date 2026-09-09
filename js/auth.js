/**
 * FitChain - Oturum Yönetimi, SHA-256 ve Güvenli Duo Tema Motoru
 */

import { CONFIG, USER_THEMES } from "./config.js";

/**
 * Web Crypto API ile SHA-256 Şifre Özeti Üretir
 */
export async function hashPassword(plainPassword) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainPassword);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Aktif Oturumu Olan Kullanıcıyı Döndürür
 */
export function getActiveUser() {
  return sessionStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_USER) || null;
}

/**
 * Aktif Kullanıcıyı Oturuma Kaydeder ve Temasını Güvenle Uygular
 */
export function setActiveUserSession(username, themeId = "blue") {
  const normalized = (username || "").toLowerCase().trim();
  sessionStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_USER, normalized);
  applyUserTheme(themeId);
  return normalized;
}

/**
 * Oturumu Sonlandırır
 */
export function logoutUserSession() {
  sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ACTIVE_USER);
  document.documentElement.removeAttribute("data-user-theme");
}

/**
 * Kullanıcı Bilgilerini Doğrular
 */
export async function verifyCredentials(username, plainPassword, accountsDb) {
  const normalized = (username || "").toLowerCase().trim();
  const account = accountsDb?.[normalized];
  if (!account) {
    return { success: false, message: "Kullanıcı bulunamadı." };
  }

  const hash = await hashPassword(plainPassword);
  if (account.passwordHash !== hash) {
    return { success: false, message: "Girdiğiniz şifre hatalı." };
  }

  return { success: true, username: normalized };
}

/**
 * Profil Temasını Güvenli Şekilde Tüm Arayüze Uygular
 * Parametre olarak 'blue', 'pink', kullanıcı adı veya boşluk gelse dahi hata vermez.
 */
export function applyUserTheme(themeOrUser = "blue") {
  const key = (themeOrUser || "").toLowerCase().trim();

  // 'blue'/'pink' doğrudan eşleşmesi veya geriye dönük kullanıcı adı toleransı
  let theme = USER_THEMES[key];
  if (!theme) {
    if (key === "gulbilge") {
      theme = USER_THEMES.pink;
    } else {
      theme = USER_THEMES.blue; // Varsayılan güvenli fallback
    }
  }

  // HTML kök etiketine tema niteliğini bas
  document.documentElement.setAttribute("data-user-theme", theme.id);

  // Dinamik metin vurguları
  const accentTexts = document.querySelectorAll(".theme-accent-text");
  accentTexts.forEach((el) => {
    el.className = el.className.replace(/text-(sky|rose|emerald|fuchsia)-\d+/g, "");
    el.classList.add(theme.id === "blue" ? "text-sky-400" : "text-rose-400");
  });

  // Dinamik arka plan vurguları
  const accentBgs = document.querySelectorAll(".theme-accent-bg");
  accentBgs.forEach((el) => {
    el.className = el.className.replace(/bg-(sky|rose|emerald|fuchsia)-\d+/g, "");
    if (theme.id === "blue") {
      el.classList.remove("bg-gradient-to-r", "from-rose-500", "to-fuchsia-500");
      el.classList.add("bg-sky-500");
    } else {
      el.classList.remove("bg-sky-500");
      el.classList.add("bg-gradient-to-r", "from-rose-500", "to-fuchsia-500");
    }
  });

  // Dinamik kenarlık vurguları
  const accentBorders = document.querySelectorAll(".theme-accent-border");
  accentBorders.forEach((el) => {
    el.className = el.className.replace(/border-(sky|rose|emerald|fuchsia)-\d+(\/\d+)?/g, "");
    el.classList.add(theme.id === "blue" ? "border-sky-500/40" : "border-rose-500/40");
  });
}
