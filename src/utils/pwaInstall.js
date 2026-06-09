// Captura o evento `beforeinstallprompt` o quanto antes (no momento que esse
// módulo é importado pelo main.jsx). Sem isso, se o evento dispara antes da
// ProfilePage existir, perdemos a oportunidade de oferecer a instalação.

let deferredPrompt = null;
const listeners = new Set();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((cb) => cb(e));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((cb) => cb(null));
  });
}

export function getInstallPrompt() {
  return deferredPrompt;
}

/**
 * Inscreve um callback que é chamado imediatamente com o estado atual
 * e novamente sempre que o evento muda. Retorna uma função pra cancelar.
 */
export function subscribeInstallPrompt(callback) {
  listeners.add(callback);
  // Avisa imediatamente com o valor atual
  callback(deferredPrompt);
  return () => listeners.delete(callback);
}

export async function promptInstall() {
  if (!deferredPrompt) return null;
  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      deferredPrompt = null;
      listeners.forEach((cb) => cb(null));
    }
    return outcome;
  } catch (err) {
    console.warn("PWA install prompt falhou:", err);
    return null;
  }
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;
  // iOS Safari não suporta dvh display-mode mas tem navigator.standalone
  if (window.navigator?.standalone === true) return true;
  return false;
}

export function detectPlatform() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (
    navigator.platform === "MacIntel" &&
    navigator.maxTouchPoints > 1
  )
    return "ios";
  return "desktop";
}
