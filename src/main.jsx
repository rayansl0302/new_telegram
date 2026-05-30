import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import { registerPwa } from "./registerPwa";
import "./index.css";
import App from "./App.jsx";

/**
 * Detecta iOS (iPhone, iPad, iPod, e iPad em modo desktop no iPadOS 13+).
 * No iPadOS 13+ o user-agent reporta MacIntel + tem maxTouchPoints > 1.
 */
function isIOS() {
  if (typeof navigator === "undefined") return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  return (
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
  );
}

/**
 * iOS PWA/Safari não encolhe o 100dvh quando o teclado abre — fica um espaço
 * em branco entre o input e o teclado. Sincronizamos --app-vh com a altura
 * visível real (visualViewport).
 *
 * Só ativa em iOS porque em Android Chrome o navegador já redimensiona o
 * webview corretamente, e aplicar o fix lá causou regressão (input subindo
 * pro topo da tela).
 */
function setupIOSViewportFix() {
  if (!isIOS() || !window.visualViewport) return;

  const update = () => {
    const h = window.visualViewport.height;
    // Sanity check — ignora valores claramente inválidos
    if (typeof h !== "number" || h < 100) return;
    document.documentElement.style.setProperty("--app-vh", `${h}px`);
  };

  window.visualViewport.addEventListener("resize", update);
  update();
}

setupIOSViewportFix();

registerPwa();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
