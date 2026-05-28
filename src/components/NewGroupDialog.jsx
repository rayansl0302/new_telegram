import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createGroup, findUserByEmail } from "../services/chatService";
import { uploadGroupPhoto } from "../services/storageService";
import Avatar from "./Avatar";

function NewGroupDialog({ onClose, onGroupCreated, contacts }) {
  const { user } = useAuth();
  const fileRef = useRef(null);

  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [knownContacts, setKnownContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [emailInput, setEmailInput] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setKnownContacts(contacts || []);
  }, [contacts]);

  const toggleMember = (uid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleAddByEmail = async () => {
    setEmailError("");
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (email === user.email.toLowerCase()) {
      setEmailError("Você já será membro");
      return;
    }
    if (knownContacts.some((c) => c.email?.toLowerCase() === email)) {
      const existing = knownContacts.find(
        (c) => c.email?.toLowerCase() === email
      );
      setSelectedIds((prev) => new Set(prev).add(existing.uid));
      setEmailInput("");
      return;
    }

    setEmailBusy(true);
    try {
      const found = await findUserByEmail(email);
      if (!found) {
        setEmailError("Usuário não encontrado");
        return;
      }
      setKnownContacts((prev) => [...prev, found]);
      setSelectedIds((prev) => new Set(prev).add(found.uid));
      setEmailInput("");
    } catch (err) {
      console.error(err);
      setEmailError("Erro ao buscar usuário");
    } finally {
      setEmailBusy(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Dê um nome ao grupo");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Selecione ao menos 1 membro");
      return;
    }

    const members = knownContacts.filter((c) => selectedIds.has(c.uid));
    setBusy(true);
    try {
      const currentUserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };
      const groupId = await createGroup(currentUserData, {
        name,
        photoURL,
        members,
      });
      onGroupCreated(groupId);
    } catch (err) {
      console.error(err);
      setError("Erro ao criar grupo");
    } finally {
      setBusy(false);
    }
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddByEmail();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-1">Novo grupo</h2>
        <p className="text-sm text-slate-400 mb-4">
          Escolha um nome, foto e adicione os membros.
        </p>

        <div className="flex-1 overflow-y-auto space-y-4 -mx-1 px-1">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar src={photoURL} name={name || "Grupo"} size={64} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || busy}
                className="absolute -bottom-1 -right-1 p-1.5 bg-sky-500 hover:bg-sky-600 rounded-full transition disabled:opacity-50 border-2 border-slate-800"
                title="Foto do grupo"
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
            </div>
            <input
              type="text"
              placeholder="Nome do grupo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              autoFocus
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">
              Adicionar membro por email
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
              >
                {emailBusy ? <SpinnerIcon /> : <PlusIcon />}
              </button>
            </div>
            {emailError && (
              <p className="text-red-400 text-xs mt-1.5">{emailError}</p>
            )}
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-2">
              Membros ({selectedIds.size} selecionado
              {selectedIds.size !== 1 ? "s" : ""})
            </p>
            {knownContacts.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                Nenhum contato ainda. Adicione membros pelo email acima.
              </p>
            ) : (
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg divide-y divide-slate-800 max-h-56 overflow-y-auto">
                {knownContacts.map((c) => {
                  const selected = selectedIds.has(c.uid);
                  return (
                    <button
                      key={c.uid}
                      type="button"
                      onClick={() => toggleMember(c.uid)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-800/50 transition text-left"
                    >
                      <Avatar
                        src={c.photoURL}
                        name={c.displayName || c.email}
                        size={36}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {c.displayName || c.email}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {c.email}
                        </p>
                      </div>
                      <Checkbox checked={selected} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || uploading}
            className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {busy ? "Criando..." : "Criar grupo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Checkbox({ checked }) {
  return (
    <div
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 ${
        checked ? "bg-sky-500 border-sky-500" : "border-slate-600"
      }`}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
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

export default NewGroupDialog;
