import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  updateGroupInfo,
  addGroupMember,
  removeGroupMember,
  findUserByEmail,
} from "../services/chatService";
import { uploadGroupPhoto } from "../services/storageService";
import Avatar from "./Avatar";

function EditGroupDialog({ chat, onClose, onLeftGroup }) {
  const { user } = useAuth();
  const fileRef = useRef(null);

  const isAdmin = chat.admins?.includes(user.uid) ?? false;

  const [name, setName] = useState(chat.name || "");
  const [photoURL, setPhotoURL] = useState(chat.photoURL || "");
  const [emailInput, setEmailInput] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingUid, setRemovingUid] = useState(null);

  const members = (chat.participants || []).map((uid) => ({
    uid,
    ...(chat.participantInfo?.[uid] || {}),
  }));

  const infoDirty =
    isAdmin &&
    (name.trim() !== (chat.name || "").trim() ||
      photoURL !== (chat.photoURL || ""));

  const handleSaveInfo = async () => {
    setError("");
    setSuccess("");
    if (!name.trim()) {
      setError("O nome do grupo não pode ficar vazio");
      return;
    }
    setBusy(true);
    try {
      await updateGroupInfo(chat.id, {
        name: name.trim(),
        photoURL: photoURL || null,
      });
      setSuccess("Grupo atualizado");
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar alterações");
    } finally {
      setBusy(false);
    }
  };

  const handlePhoto = async (e) => {
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
      const url = await uploadGroupPhoto(file);
      setPhotoURL(url);
    } catch (err) {
      console.error(err);
      setError("Erro ao subir a imagem");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAddByEmail = async () => {
    setEmailError("");
    setSuccess("");
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (email === user.email.toLowerCase()) {
      setEmailError("Você já é membro deste grupo");
      return;
    }
    const alreadyMember = members.some(
      (m) => m.email?.toLowerCase() === email
    );
    if (alreadyMember) {
      setEmailError("Usuário já está no grupo");
      return;
    }

    setEmailBusy(true);
    try {
      const found = await findUserByEmail(email);
      if (!found) {
        setEmailError("Usuário não encontrado");
        return;
      }
      await addGroupMember(chat.id, found);
      setEmailInput("");
      setSuccess(`${found.displayName || found.email} adicionado ao grupo`);
    } catch (err) {
      console.error(err);
      setEmailError(err.message || "Erro ao adicionar membro");
    } finally {
      setEmailBusy(false);
    }
  };

  const handleRemoveMember = async (uid) => {
    setError("");
    setSuccess("");
    setRemovingUid(uid);
    try {
      await removeGroupMember(chat.id, uid);
      if (uid === user.uid) {
        onLeftGroup?.();
        onClose();
        return;
      }
      setSuccess("Membro removido do grupo");
    } catch (err) {
      console.error(err);
      setError(err.message || "Erro ao remover membro");
    } finally {
      setRemovingUid(null);
    }
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddByEmail();
    }
  };

  const canRemoveOthers = isAdmin && members.length > 2;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-group-title"
    >
      <div
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-group-title" className="text-xl font-bold mb-1">
          {isAdmin ? "Editar grupo" : "Informações do grupo"}
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          {isAdmin
            ? "Altere nome, foto e gerencie os membros."
            : "Visualize os dados do grupo."}
        </p>

        <div className="flex-1 overflow-y-auto space-y-4 -mx-1 px-1">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar src={photoURL} name={name || "Grupo"} size={64} />
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || busy}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-sky-500 hover:bg-sky-600 rounded-full transition disabled:opacity-50 border-2 border-slate-800"
                    title="Trocar foto do grupo"
                    aria-label="Trocar foto do grupo"
                  >
                    {uploading ? <SpinnerIcon /> : <CameraIcon />}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhoto}
                    className="hidden"
                  />
                </>
              )}
            </div>
            {isAdmin ? (
              <input
                type="text"
                placeholder="Nome do grupo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            ) : (
              <p className="flex-1 font-semibold text-lg truncate">
                {chat.name || "Grupo sem nome"}
              </p>
            )}
          </div>

          {isAdmin && infoDirty && (
            <button
              type="button"
              onClick={handleSaveInfo}
              disabled={busy || uploading}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold rounded-lg transition"
            >
              {busy ? "Salvando..." : "Salvar nome e foto"}
            </button>
          )}

          {isAdmin && (
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Adicionar membro por e-mail
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleEmailKeyDown}
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddByEmail}
                  disabled={emailBusy || !emailInput.trim()}
                  className="px-4 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg transition flex items-center justify-center"
                  aria-label="Adicionar membro"
                >
                  {emailBusy ? <SpinnerIcon /> : <PlusIcon />}
                </button>
              </div>
              {emailError && (
                <p className="text-red-400 text-xs mt-1.5">{emailError}</p>
              )}
            </div>
          )}

          <div>
            <p className="text-sm text-slate-400 mb-2">
              Membros ({members.length})
            </p>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg divide-y divide-slate-800 max-h-56 overflow-y-auto">
              {members.map((m) => {
                const isSelf = m.uid === user.uid;
                const isMemberAdmin = chat.admins?.includes(m.uid);
                const showRemove =
                  (isAdmin && !isSelf && canRemoveOthers) ||
                  (isSelf && members.length > 2);
                const removing = removingUid === m.uid;

                return (
                  <div
                    key={m.uid}
                    className="flex items-center gap-3 p-3"
                  >
                    <Avatar
                      src={m.photoURL}
                      name={m.displayName || m.email}
                      size={36}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {m.displayName || m.email}
                        {isSelf && (
                          <span className="text-slate-500 font-normal">
                            {" "}
                            (você)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {m.email}
                        {isMemberAdmin && " · Admin"}
                      </p>
                    </div>
                    {showRemove && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.uid)}
                        disabled={removing || removingUid !== null}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                        title={isSelf ? "Sair do grupo" : "Remover membro"}
                        aria-label={
                          isSelf ? "Sair do grupo" : "Remover membro"
                        }
                      >
                        {removing ? (
                          <SpinnerIcon />
                        ) : isSelf ? (
                          <LeaveIcon />
                        ) : (
                          <RemoveIcon />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {isAdmin && members.length <= 2 && (
              <p className="text-xs text-slate-500 mt-1.5">
                O grupo precisa ter pelo menos 2 membros.
              </p>
            )}
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
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
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

export default EditGroupDialog;
