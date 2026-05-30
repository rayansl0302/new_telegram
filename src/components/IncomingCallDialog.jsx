import { createPortal } from "react-dom";
import Avatar from "./Avatar";

function IncomingCallDialog({ incoming, onAccept, onReject }) {
  const callerName =
    incoming.callerInfo?.displayName || "Alguém";
  const callerPhoto = incoming.callerInfo?.photoURL || null;
  const isVideo = incoming.type === "video";

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur z-[90] flex flex-col items-center justify-center text-white p-6">
      <p className="text-sm text-slate-400 mb-2">
        {isVideo ? "Chamada de vídeo" : "Chamada de voz"}
      </p>

      <div className="mb-4 animate-pulse">
        <Avatar src={callerPhoto} name={callerName} size={140} />
      </div>

      <h2 className="text-2xl font-semibold">{callerName}</h2>
      <p className="text-sm text-slate-400 mt-1">
        está chamando você...
      </p>

      <div className="mt-12 flex items-center gap-12">
        <button
          type="button"
          onClick={onReject}
          className="p-5 bg-red-500 hover:bg-red-600 rounded-full transition shadow-xl"
          title="Rejeitar"
          aria-label="Rejeitar chamada"
        >
          <HangupIcon />
        </button>

        <button
          type="button"
          onClick={onAccept}
          className="p-5 bg-green-500 hover:bg-green-600 rounded-full transition shadow-xl"
          title="Atender"
          aria-label="Atender chamada"
        >
          {isVideo ? <VideoIcon /> : <PhoneIcon />}
        </button>
      </div>

      <p className="text-xs text-slate-500 mt-12 text-center max-w-xs">
        Permita acesso ao microfone {isVideo && "e à câmera "}quando o
        navegador pedir.
      </p>
    </div>,
    document.body
  );
}

function PhoneIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function HangupIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: "rotate(135deg)" }}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export default IncomingCallDialog;
