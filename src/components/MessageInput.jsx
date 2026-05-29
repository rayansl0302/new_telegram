import { useEffect, useRef, useState } from "react";
import { sendMessage } from "../services/chatService";
import { uploadChatImage } from "../services/storageService";

function MessageInput({ chatId, senderId, replyingTo, onCancelReply }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const textRef = useRef(null);

  // Foca no campo de texto quando uma resposta é marcada
  useEffect(() => {
    if (replyingTo) {
      textRef.current?.focus();
    }
  }, [replyingTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await sendMessage(chatId, senderId, {
        text: text.trim(),
        replyTo: replyingTo || undefined,
      });
      setText("");
      onCancelReply?.();
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
      await sendMessage(chatId, senderId, {
        imageUrl: url,
        replyTo: replyingTo || undefined,
      });
      onCancelReply?.();
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar imagem");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-950/95 backdrop-blur shrink-0">
      {replyingTo && (
        <div className="px-3 pt-2">
          <div className="flex items-stretch gap-2 bg-slate-800/60 border-l-4 border-sky-500 rounded px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sky-400 truncate">
                Respondendo a {replyingTo.senderName || "mensagem"}
              </p>
              <p className="text-sm text-slate-300 truncate">
                {replyingTo.text ||
                  (replyingTo.imageUrl ? "[Imagem]" : "")}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 text-slate-400 hover:text-white self-start flex-shrink-0"
              title="Cancelar resposta"
              aria-label="Cancelar resposta"
            >
              <CloseSmallIcon />
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="p-3 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
          title="Anexar imagem"
          aria-label="Anexar imagem"
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
          ref={textRef}
          type="text"
          placeholder={
            replyingTo ? "Escreva sua resposta..." : "Digite uma mensagem..."
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="p-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-30 text-white rounded-full transition"
          aria-label="Enviar"
        >
          <SendIcon />
        </button>
      </form>
    </div>
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

function CloseSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default MessageInput;
