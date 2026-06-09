import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../services/userService";
import { uploadAvatar } from "../services/storageService";
import Avatar from "../components/Avatar";
import {
  subscribeInstallPrompt,
  promptInstall,
  isStandalone,
  detectPlatform,
} from "../utils/pwaInstall";

function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [photoURL, setPhotoURL] = useState(user.photoURL || "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [notifPermission, setNotifPermission] = useState(() => {
    if (typeof window === "undefined") return "unsupported";
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const [notifBusy, setNotifBusy] = useState(false);

  // PWA install
  const [hasInstallPrompt, setHasInstallPrompt] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [installing, setInstalling] = useState(false);
  const platform = detectPlatform();
  // APK gerado localmente via `npm run build:apk` e servido estaticamente
  // pelo Vercel a partir de public/downloads/app.apk.
  const APK_PATH = "/downloads/app.apk";
  const [apkAvailable, setApkAvailable] = useState(false);

  useEffect(() => {
    const unsub = subscribeInstallPrompt((evt) => {
      setHasInstallPrompt(Boolean(evt));
    });
    // Reage se for instalado em outra aba
    const onChange = () => setInstalled(isStandalone());
    const mq = window.matchMedia?.("(display-mode: standalone)");
    mq?.addEventListener?.("change", onChange);
    return () => {
      unsub();
      mq?.removeEventListener?.("change", onChange);
    };
  }, []);

  // Detecta se o APK foi gerado e está disponível
  useEffect(() => {
    if (platform !== "android") {
      setApkAvailable(false);
      return;
    }
    let cancelled = false;
    fetch(APK_PATH, { method: "HEAD" })
      .then((res) => {
        if (cancelled) return;
        // Vercel responde 200 quando o arquivo existe. Em dev, vite serve
        // estáticos com 200 também. Se 404, o APK ainda não foi gerado.
        const contentType = res.headers.get("content-type") || "";
        const isApk =
          res.ok &&
          (contentType.includes("octet-stream") ||
            contentType.includes("vnd.android"));
        setApkAvailable(isApk || (res.ok && !contentType.includes("text/html")));
      })
      .catch(() => {
        if (!cancelled) setApkAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [platform]);

  const handleInstallPWA = async () => {
    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        setInstalled(true);
      }
    } finally {
      setInstalling(false);
    }
  };

  // Atualiza estado se permissão mudar enquanto a página está aberta (raro)
  useEffect(() => {
    if (!("Notification" in window)) return;
    const interval = setInterval(() => {
      if (Notification.permission !== notifPermission) {
        setNotifPermission(Notification.permission);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [notifPermission]);

  const dirty =
    displayName !== (user.displayName || "") ||
    photoURL !== (user.photoURL || "");

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!displayName.trim()) {
      setError("O nome não pode ficar vazio");
      return;
    }
    setBusy(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        photoURL: photoURL || null,
      });
      refreshUser();
      setSuccess("Perfil atualizado com sucesso");
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar perfil");
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens são suportadas");
      return;
    }
    setError("");
    setSuccess("");
    setUploading(true);
    try {
      const url = await uploadAvatar(user.uid, file);
      setPhotoURL(url);
    } catch (err) {
      console.error(err);
      setError("Erro ao subir a imagem");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) return;
    setNotifBusy(true);
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      if (result === "granted") {
        // Notificação de teste rápida
        try {
          const n = new Notification("Telegram Clone", {
            body: "Notificações ativadas com sucesso!",
            tag: "test",
          });
          setTimeout(() => n.close(), 3000);
        } catch (e) {
          // ignorar se o navegador não permitir teste
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNotifBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="page-screen bg-slate-900 text-white flex flex-col min-h-0 overflow-y-auto">
      <header className="px-4 py-3 border-b border-slate-800 flex items-center gap-3 shrink-0 bg-slate-900/95 backdrop-blur z-10">
        <button
          onClick={() => navigate("/")}
          className="p-2 hover:bg-slate-800 rounded-lg transition"
          title="Voltar"
        >
          <BackIcon />
        </button>
        <h1 className="text-lg font-semibold">Meu perfil</h1>
      </header>

      <div className="max-w-md mx-auto p-6 w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <Avatar
              src={photoURL}
              name={displayName || user.email}
              size={120}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || busy}
              className="absolute bottom-0 right-0 p-2.5 bg-sky-500 hover:bg-sky-600 rounded-full transition disabled:opacity-50 border-4 border-slate-900"
              title="Trocar foto"
            >
              {uploading ? <SpinnerIcon /> : <CameraIcon />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          {photoURL && (
            <button
              type="button"
              onClick={() => setPhotoURL("")}
              disabled={uploading || busy}
              className="mt-3 text-xs text-slate-400 hover:text-red-400 transition"
            >
              Remover foto
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Nome</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">E-mail</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-500 cursor-not-allowed"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || uploading || !dirty}
            className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
          >
            {busy ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>

        <section className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <DownloadAppIcon className="text-slate-400" />
            <h3 className="text-sm font-medium text-slate-300">
              Instalar como app
            </h3>
          </div>

          {installed ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2 mb-3">
              <CheckIcon className="text-green-400" />
              <p className="text-sm text-green-400">
                App instalado neste dispositivo
              </p>
            </div>
          ) : (
            <div className="space-y-3 mb-3">
              {/* PWA — sempre disponível como opção. Botão só ativa
                  quando o browser disparou beforeinstallprompt. */}
              <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <PwaIcon className="text-sky-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100">
                      PWA (recomendado)
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Funciona em qualquer sistema. Atualiza automaticamente
                      quando há nova versão. Não ocupa espaço extra.
                    </p>
                  </div>
                </div>

                {hasInstallPrompt ? (
                  <button
                    type="button"
                    onClick={handleInstallPWA}
                    disabled={installing}
                    className="mt-3 w-full py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold rounded-lg transition"
                  >
                    {installing ? "Instalando..." : "Instalar PWA"}
                  </button>
                ) : platform === "ios" ? (
                  <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                    No iOS, toque no botão <strong>compartilhar</strong> do
                    Safari e selecione <strong>"Adicionar à Tela de
                    Início"</strong>.
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-slate-500 italic">
                    O navegador ainda não ofereceu instalação. Recarregue a
                    página e tente novamente em alguns instantes.
                  </p>
                )}
              </div>

              {/* APK Android — servido estaticamente a partir de
                  public/downloads/app.apk. Só aparece se o arquivo existe. */}
              {platform === "android" && apkAvailable && (
                <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <AndroidIcon className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100">
                        APK Android
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Aplicativo nativo com o mesmo conteúdo da PWA. Para
                        instalar fora da Play Store, permita "Fontes
                        desconhecidas" nas configurações de segurança.
                      </p>
                    </div>
                  </div>
                  <a
                    href={APK_PATH}
                    download="telegram-clone.apk"
                    rel="noreferrer noopener"
                    className="mt-3 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <DownloadAppIcon /> Baixar APK
                  </a>
                </div>
              )}

              {platform === "android" && !apkAvailable && (
                <p className="text-xs text-slate-500 italic">
                  Versão APK Android será disponibilizada em breve.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <BellIcon className="text-slate-400" />
            <h3 className="text-sm font-medium text-slate-300">
              Notificações
            </h3>
          </div>

          {notifPermission === "unsupported" && (
            <p className="text-sm text-slate-500">
              Seu navegador não suporta notificações.
            </p>
          )}

          {notifPermission === "granted" && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
              <CheckIcon className="text-green-400" />
              <p className="text-sm text-green-400">
                Notificações ativadas. Você receberá avisos quando chegar
                mensagem nova.
              </p>
            </div>
          )}

          {notifPermission === "default" && (
            <>
              <p className="text-sm text-slate-400 mb-3">
                Ative para receber avisos do sistema quando chegar mensagem
                nova com a aba em segundo plano.
              </p>
              <button
                type="button"
                onClick={handleEnableNotifications}
                disabled={notifBusy}
                className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <BellIcon />{" "}
                {notifBusy ? "Aguardando..." : "Ativar notificações"}
              </button>
            </>
          )}

          {notifPermission === "denied" && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-400">
              <p className="font-medium mb-1">Notificações bloqueadas</p>
              <p className="text-xs">
                Habilite manualmente no cadeado da barra de endereço do
                navegador → Permissões do site → Notificações → Permitir.
              </p>
            </div>
          )}
        </section>

        <hr className="my-8 border-slate-800" />

        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-lg transition"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function DownloadAppIcon({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PwaIcon({ className }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="10" y1="18" x2="10" y2="18" />
      <path d="M14 8h6M17 5v6" />
    </svg>
  );
}

function AndroidIcon({ className }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 10h14a1 1 0 0 1 1 1v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a1 1 0 0 1 1-1z" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3" />
      <line x1="8" y1="14" x2="8" y2="17" />
      <line x1="16" y1="14" x2="16" y2="17" />
    </svg>
  );
}

function BellIcon({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

export default ProfilePage;
