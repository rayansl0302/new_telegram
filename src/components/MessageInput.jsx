import { useEffect, useRef, useState } from "react";
import { sendMessage } from "../services/chatService";
import {
  uploadChatImage,
  uploadChatAudio,
  uploadChatFile,
} from "../services/storageService";
import CameraCapture from "./CameraCapture";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function MessageInput({ chatId, senderId, replyingTo, onCancelReply }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  const imageFileRef = useRef(null);
  const docFileRef = useRef(null);
  const textRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const recordTimerRef = useRef(null);
  const cancelRecordingFlagRef = useRef(false);

  useEffect(() => {
    if (replyingTo) {
      textRef.current?.focus();
    }
  }, [replyingTo]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const replySnap = replyingTo;
    setText("");
    onCancelReply?.();

    sendMessage(chatId, senderId, {
      text: trimmed,
      replyTo: replySnap || undefined,
    }).catch((err) => {
      console.error("Falha ao enviar:", err);
      setText((current) => current || trimmed);
      alert("Erro ao enviar a mensagem. Tente novamente.");
    });
  };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Apenas imagens são suportadas neste botão");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("Imagem muito grande (máximo 10 MB)");
      e.target.value = "";
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

  const handleDocFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert("Arquivo muito grande (máximo 10 MB)");
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const url = await uploadChatFile(chatId, file);
      await sendMessage(chatId, senderId, {
        file: {
          url,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
        },
        replyTo: replyingTo || undefined,
      });
      onCancelReply?.();
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar arquivo");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const handleCameraCapture = async (file) => {
    setShowCamera(false);
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
      alert("Erro ao enviar foto");
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof window.MediaRecorder === "undefined"
    ) {
      alert("Seu navegador não suporta gravação de áudio");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      cancelRecordingFlagRef.current = false;

      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "";
      }
      const mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        audioStreamRef.current?.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        setRecording(false);
        setRecordSeconds(0);

        if (cancelRecordingFlagRef.current) {
          audioChunksRef.current = [];
          return;
        }
        const chunks = audioChunksRef.current;
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        const ext = (mr.mimeType || "audio/webm").includes("mp4")
          ? "mp4"
          : "webm";
        const file = new File([blob], `audio-${Date.now()}.${ext}`, {
          type: blob.type,
        });
        setBusy(true);
        try {
          const url = await uploadChatAudio(chatId, file);
          await sendMessage(chatId, senderId, {
            audioUrl: url,
            replyTo: replyingTo || undefined,
          });
          onCancelReply?.();
        } catch (err) {
          console.error(err);
          alert("Erro ao enviar áudio");
        } finally {
          setBusy(false);
        }
      };

      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert(
        "Não foi possível acessar o microfone. Verifique as permissões."
      );
    }
  };

  const stopAndSend = () => {
    cancelRecordingFlagRef.current = false;
    mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    cancelRecordingFlagRef.current = true;
    mediaRecorderRef.current?.stop();
  };

  const formatRecordTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const closeAttachMenu = () => setAttachOpen(false);

  const handlePickImage = () => {
    closeAttachMenu();
    imageFileRef.current?.click();
  };
  const handlePickDoc = () => {
    closeAttachMenu();
    docFileRef.current?.click();
  };
  const handleOpenCamera = () => {
    closeAttachMenu();
    setShowCamera(true);
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

      {recording ? (
        <div className="p-2 md:p-3 flex items-center gap-2">
          <button
            type="button"
            onClick={cancelRecording}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition flex-shrink-0"
            title="Cancelar gravação"
            aria-label="Cancelar gravação"
          >
            <TrashIcon />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2 bg-slate-800 rounded-full px-3 md:px-4 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-sm text-slate-200 tabular-nums flex-shrink-0">
              {formatRecordTime(recordSeconds)}
            </span>
            <span className="flex-1 text-sm text-slate-500 truncate">
              Gravando...
            </span>
          </div>
          <button
            type="button"
            onClick={stopAndSend}
            className="p-2 bg-sky-500 hover:bg-sky-600 text-white rounded-full transition flex-shrink-0"
            title="Parar e enviar"
            aria-label="Parar e enviar"
          >
            <SendIcon />
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="p-2 md:p-3 flex items-center gap-1.5 md:gap-2"
        >
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setAttachOpen((s) => !s)}
              disabled={busy}
              className={`p-2 rounded-full transition disabled:opacity-50 ${
                attachOpen
                  ? "bg-sky-500/15 text-sky-400 rotate-45"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title="Anexar"
              aria-label="Abrir menu de anexos"
              aria-expanded={attachOpen}
            >
              <PlusIcon />
            </button>
            {attachOpen && (
              <AttachMenu
                onClose={closeAttachMenu}
                onPickImage={handlePickImage}
                onPickDoc={handlePickDoc}
                onOpenCamera={handleOpenCamera}
              />
            )}
          </div>

          <input
            ref={imageFileRef}
            type="file"
            accept="image/*"
            onChange={handleImage}
            className="hidden"
          />
          <input
            ref={docFileRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.xml,.txt,.csv,.zip,.rar,.7z,.json,.pptx,.ppt,.odt,.ods,.odp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,text/xml,application/xml,application/json,application/zip,application/x-rar-compressed,application/octet-stream"
            onChange={handleDocFile}
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
            className="flex-1 min-w-0 px-3 md:px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />

          {text.trim() ? (
            <button
              type="submit"
              className="p-2 bg-sky-500 hover:bg-sky-600 text-white rounded-full transition flex-shrink-0"
              aria-label="Enviar"
              title="Enviar"
            >
              <SendIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={busy}
              className="p-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-30 text-white rounded-full transition flex-shrink-0"
              aria-label="Gravar áudio"
              title="Gravar áudio"
            >
              <MicIcon />
            </button>
          )}
        </form>
      )}

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

function AttachMenu({ onClose, onPickImage, onPickDoc, onOpenCamera }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-full left-0 mb-2 bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-1.5 z-40 min-w-[180px]"
        role="menu"
      >
        <MenuItem
          onClick={onOpenCamera}
          icon={<CameraIcon />}
          label="Câmera"
          color="text-violet-400"
        />
        <MenuItem
          onClick={onPickImage}
          icon={<ImageIcon />}
          label="Imagem"
          color="text-sky-400"
        />
        <MenuItem
          onClick={onPickDoc}
          icon={<DocIcon />}
          label="Documento"
          color="text-amber-400"
        />
      </div>
    </>
  );
}

function MenuItem({ onClick, icon, label, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700 rounded-lg w-full text-left transition"
      role="menuitem"
    >
      <span className={`${color} flex-shrink-0`}>{icon}</span>
      <span className="text-sm text-slate-100">{label}</span>
    </button>
  );
}

function PlusIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
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

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
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
