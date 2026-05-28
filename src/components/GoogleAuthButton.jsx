import { useEffect, useRef, useCallback } from "react";
import { signInWithGoogleIdToken } from "../services/googleAuth";
import {
  getGoogleClientId,
  loadGoogleIdentityScript,
} from "../services/googleIdentity";
import { traduzErroAuth } from "../utils/authErrors";

function GoogleAuthButton({ disabled, onError, onBusy }) {
  const containerRef = useRef(null);
  const clientId = getGoogleClientId();

  const handleCredential = useCallback(
    async (response) => {
      if (!response?.credential) {
        onError?.("Login com Google cancelado");
        return;
      }
      onBusy?.(true);
      try {
        await signInWithGoogleIdToken(response.credential);
      } catch (err) {
        onError?.(
          traduzErroAuth(err?.code, err?.message || "", { provider: "google" })
        );
      } finally {
        onBusy?.(false);
      }
    },
    [onError, onBusy]
  );

  useEffect(() => {
    if (!clientId || !containerRef.current) return;

    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
          itp_support: true,
          use_fedcm_for_prompt: false,
        });

        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: Math.min(containerRef.current.offsetWidth || 320, 400),
          locale: "pt-BR",
        });
      })
      .catch((err) => {
        onError?.(err?.message || "Erro ao carregar Google Sign-In");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, handleCredential, onError]);

  if (!clientId) {
    return (
      <p className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
        Adicione <code className="text-amber-200">VITE_GOOGLE_CLIENT_ID</code>{" "}
        no .env (Firebase Console → Authentication → Google → ID do cliente
        Web).
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full min-h-[44px] flex justify-center overflow-hidden rounded-lg bg-white ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    />
  );
}

export default GoogleAuthButton;
