export function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandalonePwa() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

/** iOS/PWA: redirect perde sessão — usar Google Identity Services (sem sair do app). */
export function shouldUseGoogleIdentity() {
  return isIOS() || isStandalonePwa();
}
