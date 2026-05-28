import { registerSW } from "virtual:pwa-register";

export function registerPwa() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      const shouldReload = window.confirm(
        "Nova versão disponível. Deseja atualizar agora?"
      );
      if (shouldReload) updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000
      );
    },
  });

  return updateSW;
}
