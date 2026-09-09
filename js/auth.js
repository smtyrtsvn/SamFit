/**
 * FitChain - Oturum Yönetimi, SHA-256 ve Duo Tema Motoru
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
 * Aktif Kullanıcıyı Oturuma Kaydeder ve Temasını Uygular
 */
export function setActiveUserSession(username) {
  const normalized = username.toLowerCase().trim();
  sessionStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_USER, normalized);
  applyUserTheme(normalized);
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
  const normalized = username.toLowerCase().trim();
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
 * Profil Temasını Tüm Arayüze Dinamik Olarak Uygular
 * samet -> Cyan/Sky Mavi | gulbilge -> Rose/Fuchsia Pembe-Mor
 */
export function applyUserTheme(username) {
  const normalized = (username || "").toLowerCase().trim();
  const theme = USER_THEMES[normalized] || USER_THEMES.samet;

  document.documentElement.setAttribute("data-user-theme", theme.id);

  // Dinamik renk sınıflarını taşıyan DOM elemanlarını güncelle
  const accentTexts = document.querySelectorAll(".theme-accent-text");
  accentTexts.forEach((el) => {
    el.className = el.className.replace(/text-(sky|rose|emerald|fuchsia)-\d+/g, "");
    el.classList.add(theme.id === "samet" ? "text-sky-400" : "text-rose-400");
  });

  const accentBgs = document.querySelectorAll(".theme-accent-bg");
  accentBgs.forEach((el) => {
    el.className = el.className.replace(/bg-(sky|rose|emerald|fuchsia)-\d+/g, "");
    if (theme.id === "samet") {
      el.classList.remove("bg-gradient-to-r", "from-rose-500", "to-fuchsia-500");
      el.classList.add("bg-sky-500");
    } else {
      el.classList.remove("bg-sky-500");
      el.classList.add("bg-gradient-to-r", "from-rose-500", "to-fuchsia-500");
    }
  });

  const accentBorders = document.querySelectorAll(".theme-accent-border");
  accentBorders.forEach((el) => {
    el.className = el.className.replace(/border-(sky|rose|emerald|fuchsia)-\d+(\/\d+)?/g, "");
    el.classList.add(theme.id === "samet" ? "border-sky-500/40" : "border-rose-500/40");
  });
}