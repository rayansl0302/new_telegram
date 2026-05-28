import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  updateGroupInfo,
  addGroupMember,
  removeGroupMember,
  promoteToAdmin,
  demoteFromAdmin,
  findUserByEmail,
} from "../services/chatService";
import { uploadGroupPhoto } from "../services/storageService";
import Avatar from "./Avatar";

function ChatInfoPanel({ chat, messages, onClose, onLeftGroup }) {
  const isGroup = chat.type === "group";
  return isGroup ? (
    <GroupView
      chat={chat}
      messages={messages}
      onClose={onClose}
      onLeftGroup={onLeftGroup}
    />
  ) : (
    <ContactView chat={chat} messages={messages} onClose={onClose} />
  );
}

// ───────────────────────────────────────────────────────────────────
// ContactView (chat direto)
// ───────────────────────────────────────────────────────────────────

function ContactView({ chat, messages, onClose }) {
  const { user } = useAuth();
  const otherId = chat.participants.find((p) => p !== user.uid);
  const info = chat.participantInfo?.[otherId] || {};
  const name = info.displayName || info.email || "Usuário";

  return (
    <PanelShell>
      <PanelHeader title="Dados do contato" onClose={onClose} />
      <div className="flex-1 overflow-y-auto">
        <section className="p-6 border-b border-slate-800 flex flex-col items-center text-center">
          <Avatar src={info.photoURL} name={name} size={140} />
          <h3 className="text-2xl font-semibold mt-4 truncate max-w-full px-2">
            {name}
          </h3>
          <p className="text-sm text-slate-400 mt-1 truncate max-w-full px-2">
            {info.email}
          </p>
        </section>

        <MediaSection messages={messages} />
      </div>
    </PanelShell>
  );
}

// ───────────────────────────────────────────────────────────────────
// GroupView (grupo)
// ───────────────────────────────────────────────────────────────────

function GroupView({ chat, messages, onClose, onLeftGroup }) {
  const { user } = useAuth();
  const fileRef = useRef(null);

  const isAdmin = chat.admins?.includes(user.uid) ?? false;
  const adminCount = chat.admins?.length || 0;

  const [name, setName] = useState(chat.name || "");
  const [photoURL, setPhotoURL] = useState(chat.photoURL || "");
  const [emailInput, setEmailInput] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const members = (chat.participants || []).map((uid) => ({
    uid,
    ...(chat.participantInfo?.[uid] || {}),
  }));

  const infoDirty =
    isAdmin &&
    (name.trim() !== (chat.name || "").trim() ||
      photoURL !== (chat.photoURL || ""));

  const clearMessages = () => {
    setError("");
    setSuccess("");
    setEmailError("");
  };

  const handleSaveInfo = async () => {
    clearMessages();
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
    clearMessages();
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
    clearMessages();
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (email === user.email.toLowerCase()) {
      setEmailError("Você já é membro deste grupo");
      return;
    }
    if (members.some((m) => m.email?.toLowerCase() === email)) {
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
    const isSelf = uid === user.uid;
    const target = members.find((m) => m.uid === uid);
    const targetName = target?.displayName || target?.email || "este membro";
    const confirmMsg = isSelf
      ? "Tem certeza que quer sair deste grupo?"
      : `Remover ${targetName} do grupo?`;
    if (!window.confirm(confirmMsg)) return;

    clearMessages();
    setPendingAction({ uid, type: "remove" });
    try {
      await removeGroupMember(chat.id, uid);
      if (isSelf) {
        onLeftGroup?.();
        onClose();
        return;
      }
      setSuccess(`${targetName} removido do grupo`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erro ao remover membro");
    } finally {
      setPendingAction(null);
    }
  };

  const handlePromote = async (uid) => {
    clearMessages();
    setPendingAction({ uid, type: "promote" });
    try {
      await promoteToAdmin(chat.id, uid);
      const target = members.find((m) => m.uid === uid);
      setSuccess(
        `${target?.displayName || target?.email || "Membro"} agora é admin`
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Erro ao promover");
    } finally {
      setPendingAction(null);
    }
  };

  const handleDemote = async (uid) => {
    const target = members.find((m) => m.uid === uid);
    const targetName = target?.displayName || target?.email || "este admin";
    if (!window.confirm(`Remover ${targetName} como administrador?`)) return;

    clearMessages();
    setPendingAction({ uid, type: "demote" });
    try {
      await demoteFromAdmin(chat.id, uid);
      setSuccess(`${targetName} não é mais admin`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erro ao remover admin");
    } finally {
      setPendingAction(null);
    }
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddByEmail();
    }
  };

  const canLeave = members.length > 2;
  const pendingSelf = pendingAction?.uid === user.uid;

  return (
    <PanelShell>
      <PanelHeader title="Dados do grupo" onClose={onClose} />

      <div className="flex-1 overflow-y-auto">
        <section className="p-6 border-b border-slate-800 flex flex-col items-center text-center">
          <div className="relative">
            <Avatar src={photoURL} name={name || "Grupo"} size={120} />
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || busy}
                  className="absolute bottom-0 right-0 p-2.5 bg-sky-500 hover:bg-sky-600 rounded-full transition disabled:opacity-50 border-4 border-slate-900"
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

          <div className="mt-4 w-full">
            {isAdmin ? (
              <input
                type="text"
                placeholder="Nome do grupo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="w-full px-3 py-2 text-xl font-semibold bg-transparent border-b border-slate-700 focus:border-sky-500 outline-none text-center"
              />
            ) : (
              <p className="text-xl font-semibold truncate">
                {chat.name || "Grupo sem nome"}
              </p>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Grupo · {members.length} membros
          </p>

          {isAdmin && infoDirty && (
            <button
              type="button"
              onClick={handleSaveInfo}
              disabled={busy || uploading}
              className="mt-3 px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
            >
              {busy ? "Salvando..." : "Salvar alterações"}
            </button>
          )}
        </section>

        {isAdmin && (
          <section className="p-4 border-b border-slate-800">
            <p className="text-sm text-slate-400 mb-2">
              Adicionar membro por e-mail
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@exemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleAddByEmail}
                disabled={emailBusy || !emailInput.trim()}
                className="px-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg transition flex items-center justify-center"
                aria-label="Adicionar membro"
              >
                {emailBusy ? <SpinnerIcon /> : <PlusIcon />}
              </button>
            </div>
            {emailError && (
              <p className="text-red-400 text-xs mt-1.5">{emailError}</p>
            )}
          </section>
        )}

        <section className="p-4 border-b border-slate-800">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm text-slate-400">
              {members.length} membros
            </p>
            <p className="text-xs text-slate-500">
              {adminCount} admin{adminCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="space-y-0.5">
            {members.map((m) => {
              const isSelf = m.uid === user.uid;
              const isMemberAdmin = chat.admins?.includes(m.uid);
              const pending = pendingAction?.uid === m.uid;
              const pendingType = pending ? pendingAction.type : null;

              const canManage = isAdmin && !isSelf;
              const showRemove = canManage && members.length > 2;

              return (
                <div
                  key={m.uid}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-800/40 transition"
                >
                  <Avatar
                    src={m.photoURL}
                    name={m.displayName || m.email}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate flex items-center gap-1.5">
                      <span className="truncate">
                        {m.displayName || m.email}
                      </span>
                      {isSelf && (
                        <span className="text-slate-500 font-normal text-xs flex-shrink-0">
                          (você)
                        </span>
                      )}
                      {isMemberAdmin && <AdminBadge />}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {m.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {canManage &&
                      (isMemberAdmin ? (
                        <button
                          type="button"
                          onClick={() => handleDemote(m.uid)}
                          disabled={pending || adminCount <= 1}
                          className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                          title={
                            adminCount <= 1
                              ? "Não há outros admins"
                              : "Remover como admin"
                          }
                          aria-label="Remover como admin"
                        >
                          {pendingType === "demote" ? (
                            <SpinnerIcon />
                          ) : (
                            <ShieldFilledIcon />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePromote(m.uid)}
                          disabled={pending}
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition disabled:opacity-50"
                          title="Tornar admin"
                          aria-label="Tornar admin"
                        >
                          {pendingType === "promote" ? (
                            <SpinnerIcon />
                          ) : (
                            <ShieldIcon />
                          )}
                        </button>
                      ))}
                    {showRemove && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.uid)}
                        disabled={pending}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                        title="Remover do grupo"
                        aria-label="Remover do grupo"
                      >
                        {pendingType === "remove" ? (
                          <SpinnerIcon />
                        ) : (
                          <RemoveIcon />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <MediaSection messages={messages} />

        {error && (
          <p className="mx-4 mb-4 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {error}
          </p>
        )}
        {success && (
          <p className="mx-4 mb-4 text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            {success}
          </p>
        )}
      </div>

      {canLeave && (
        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => handleRemoveMember(user.uid)}
            disabled={pendingSelf}
            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LeaveIcon /> Sair do grupo
          </button>
        </div>
      )}
    </PanelShell>
  );
}

// ───────────────────────────────────────────────────────────────────
// Subcomponentes compartilhados
// ───────────────────────────────────────────────────────────────────

function PanelShell({ children }) {
  return (
    <aside className="w-full md:w-96 lg:w-[420px] bg-slate-900 border-l border-slate-800 flex flex-col min-h-0 shrink-0">
      {children}
    </aside>
  );
}

function PanelHeader({ title, onClose }) {
  return (
    <header className="px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-800 flex items-center gap-2 md:gap-3 bg-slate-950/95 backdrop-blur shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="p-2 -ml-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition flex-shrink-0"
        aria-label="Fechar painel"
      >
        <CloseIcon />
      </button>
      <h2 className="text-lg font-semibold">{title}</h2>
    </header>
  );
}

function MediaSection({ messages }) {
  const media = (messages || [])
    .filter((m) => m.imageUrl)
    .slice()
    .reverse(); // mais recentes primeiro

  return (
    <section className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <MediaIcon />
          Mídia compartilhada
        </p>
        {media.length > 0 && (
          <p className="text-xs text-slate-500">{media.length}</p>
        )}
      </div>
      {media.length === 0 ? (
        <p className="text-xs text-slate-500 italic">
          Nenhuma imagem enviada ainda.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {media.map((m) => (
            <a
              key={m.id}
              href={m.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="aspect-square overflow-hidden rounded bg-slate-800 group block"
            >
              <img
                src={m.imageUrl}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition"
              />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminBadge() {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 flex-shrink-0"
      title="Administrador"
    >
      Admin
    </span>
  );
}

// ───────────────────────────────────────────────────────────────────
// Icons
// ───────────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function MediaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ShieldFilledIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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

export default ChatInfoPanel;
