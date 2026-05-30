import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import { registerPwa } from "./registerPwa";
import "./index.css";
import App from "./App.jsx";

// Mantém --app-vh sincronizado com a altura visível real (visualViewport),
// que muda quando o teclado abre no mobile. Sem isso, em iOS PWA o teclado
// cria um espaço em branco entre o input e o teclado.
function setupViewportHeight() {
  const update = () => {
    const h = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty("--app-vh", `${h}px`);
  };
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", update);
    window.visualViewport.addEventListener("scroll", update);
  }
  window.addEventListener("resize", update);
  update();
}
setupViewportHeight();

registerPwa();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
