import { useRef, useState } from "react";
import { sendMessage } from "../services/chatService";
import { uploadChatImage } from "../services/storageService";

function MessageInput({ chatId, senderId }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await sendMessage(chatId, senderId, { text: text.trim() });
      setText("");
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar mensagem");
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Apenas imagens são suportadas");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadChatImage(chatId, file);
      await sendMessage(chatId, senderId, { imageUrl: url });
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar imagem");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 border-t border-slate-800 bg-slate-950/95 backdrop-blur flex items-center gap-2 shrink-0"
    >
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
        title="Anexar imagem"
      >
        <AttachIcon />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <input
        type="text"
        placeholder="Digite uma mensagem..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="p-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-30 text-white rounded-full transition"
      >
        <SendIcon />
      </button>
    </form>
  );
}

function AttachIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default MessageInput;
