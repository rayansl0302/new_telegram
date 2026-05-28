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

export function isMobile() {
  return (
    isIOS() ||
    /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

/** Popup do Google quebra no iOS / PWA; redirect + IndexedDB resolve. */
export function shouldUseGoogleRedirect() {
  return isIOS() || isStandalonePwa() || isMobile();
}
