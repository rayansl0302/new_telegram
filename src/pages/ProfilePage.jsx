import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../services/userService";
import { uploadAvatar } from "../services/storageService";
import Avatar from "../components/Avatar";

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
