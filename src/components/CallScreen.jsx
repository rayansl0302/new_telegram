import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Avatar from "./Avatar";

function CallScreen({ callState, onEnd }) {
  const { session, type, peer, role, status, error } = callState;
  const isVideo = type === "video";

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef(null);

  // Conecta streams aos elementos sempre que mudarem
  useEffect(() => {
    if (!session) return;

    const attachLocal = (stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
    };
    const attachRemote = (stream) => {
      if (isVideo && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    session.onLocalStream = attachLocal;
    session.onRemoteStream = attachRemote;

    // Se os streams já existem (race), conecta agora
    if (session.localStream) attachLocal(session.localStream);
    if (session.remoteStream) attachRemote(session.remoteStream);
  }, [session, isVideo]);

  useEffect(() => {
    if (status === "connected" && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedSec((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current && status !== "connected") {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleMute = () => {
    session?.toggleMute();
    setMuted((m) => !m);
  };

  const handleVideoToggle = () => {
    session?.toggleVideo();
    setVideoOff((v) => !v);
  };

  const statusLabel = (() => {
    if (error) return error;
    if (status === "connected") return formatTime(elapsedSec);
    if (status === "connecting") return "Conectando...";
    if (status === "rejected") return "Chamada rejeitada";
    if (status === "ended") return "Chamada encerrada";
    if (status === "failed") return "Falha na conexão";
    if (role === "caller" && status === "ringing") return "Chamando...";
    return status || "";
  })();

  const peerName = peer?.displayName || peer?.email || "Usuário";
  const hasError = Boolean(error);

  return createPortal(
    <div className="fixed inset-0 bg-slate-900 z-[80] flex flex-col text-white">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Vídeo remoto fullscreen (só vídeo + conectado + sem erro) */}
      {isVideo && !hasError && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover bg-black"
        />
      )}

      <div
        className={`absolute inset-0 ${
          isVideo && !hasError
            ? "bg-gradient-to-b from-black/60 via-transparent to-black/70"
            : ""
        } flex flex-col`}
      >
        <header className="p-6 flex flex-col items-center text-center">
          {(!isVideo || hasError) && (
            <div className="mt-12 mb-6">
              <Avatar src={peer?.photoURL} name={peerName} size={160} />
            </div>
          )}
          <h2 className="text-2xl font-semibold">{peerName}</h2>
          <p
            className={`text-sm mt-1 ${
              hasError ? "text-red-400" : "text-slate-300"
            }`}
          >
            {statusLabel}
          </p>

          {hasError && (
            <div className="mt-6 max-w-sm bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300">
              <p className="font-medium mb-1">Não foi possível conectar</p>
              <p className="opacity-90">{error}</p>
              <p className="text-xs text-red-400/70 mt-2">
                Verifique as permissões no cadeado da barra de endereço ou
                feche outros apps que estejam usando o microfone/câmera.
              </p>
            </div>
          )}
        </header>

        <div className="flex-1" />

        {/* Vídeo local PIP (só se vídeo e sem erro) */}
        {isVideo && !hasError && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-4 right-4 w-32 md:w-40 aspect-[3/4] rounded-lg object-cover border-2 border-white/30 shadow-xl bg-black scale-x-[-1]"
          />
        )}

        {/* Controles */}
        <footer className="p-6 pb-10 flex items-center justify-center gap-4">
          {!hasError && (
            <button
              type="button"
              onClick={handleMute}
              className={`p-4 rounded-full transition ${
                muted
                  ? "bg-white text-slate-900"
                  : "bg-white/15 hover:bg-white/25 text-white backdrop-blur"
              }`}
              title={muted ? "Ativar som" : "Mutar"}
              aria-label={muted ? "Ativar microfone" : "Mutar microfone"}
            >
              {muted ? <MicOffIcon /> : <MicIcon />}
            </button>
          )}

          {isVideo && !hasError && (
            <button
              type="button"
              onClick={handleVideoToggle}
              className={`p-4 rounded-full transition ${
                videoOff
                  ? "bg-white text-slate-900"
                  : "bg-white/15 hover:bg-white/25 text-white backdrop-blur"
              }`}
              title={videoOff ? "Ativar vídeo" : "Desativar vídeo"}
              aria-label={videoOff ? "Ativar vídeo" : "Desativar vídeo"}
            >
              {videoOff ? <VideoOffIcon /> : <VideoIcon />}
            </button>
          )}

          <button
            type="button"
            onClick={onEnd}
            className="p-5 bg-red-500 hover:bg-red-600 rounded-full transition shadow-xl"
            title={hasError ? "Fechar" : "Encerrar"}
            aria-label={hasError ? "Fechar" : "Encerrar chamada"}
          >
            <HangupIcon />
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function VideoOffIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
      <line x1="1" y1="1" x2="23" y2="23" />
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

export default CallScreen;
