import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { findUserByEmail, createOrGetChat } from "../services/chatService";

function NewChatDialog({ onClose, onChatCreated }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const target = email.trim().toLowerCase();
    if (target === user.email.toLowerCase()) {
      setError("Você não pode iniciar uma conversa consigo mesmo");
      return;
    }

    setBusy(true);
    try {
      const otherUser = await findUserByEmail(target);
      if (!otherUser) {
        setError("Usuário não encontrado. Ele precisa se cadastrar primeiro.");
        return;
      }

      const currentUserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };

      const chatId = await createOrGetChat(currentUserData, otherUser);

      onChatCreated({
        id: chatId,
        participants: [user.uid, otherUser.uid],
        participantInfo: {
          [user.uid]: {
            displayName: user.displayName || user.email,
            photoURL: user.photoURL,
            email: user.email,
          },
          [otherUser.uid]: {
            displayName: otherUser.displayName || otherUser.email,
            photoURL: otherUser.photoURL,
            email: otherUser.email,
          },
        },
      });
    } catch (err) {
      console.error(err);
      setError("Erro ao criar conversa");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center modal-overlay z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-1">Nova conversa</h2>
        <p className="text-sm text-slate-400 mb-4">
          Informe o e-mail de quem você quer conversar.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {busy ? "Buscando..." : "Iniciar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewChatDialog;
