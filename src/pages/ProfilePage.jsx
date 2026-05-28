import { useRef, useState } from "react";
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

  const dirty =
    displayName !== (user.displayName || "") || photoURL !== (user.photoURL || "");

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

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="px-4 py-3 border-b border-slate-800 flex items-center gap-3 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
        <button
          onClick={() => navigate("/")}
          className="p-2 hover:bg-slate-800 rounded-lg transition"
          title="Voltar"
        >
          <BackIcon />
        </button>
        <h1 className="text-lg font-semibold">Meu perfil</h1>
      </header>

      <div className="max-w-md mx-auto p-6">
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
