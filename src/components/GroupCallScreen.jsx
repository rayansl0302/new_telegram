import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Avatar from "./Avatar";

function GroupCallScreen({ callState, onLeave }) {
  const { session, type, chat, status, error } = callState;
  const isVideo = type === "video";

  const [remotes, setRemotes] = useState(new Map()); // uid -> { stream, peerInfo }
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const localVideoRef = useRef(null);
  const timerRef = useRef(null);

  // Vincula stream local + ouve participantes remotos
  useEffect(() => {
    if (!session) return;

    const attachLocal = (stream) => {
      if (localVideoRef.current && isVideo) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
    };

    session.onLocalStream = attachLocal;
    session.onParticipantStream = (uid, stream, peerInfo) => {
      setRemotes((prev) => {
        const next = new Map(prev);
        next.set(uid, { stream, peerInfo });
        return next;
      });
    };
    session.onParticipantLeft = (uid) => {
      setRemotes((prev) => {
        const next = new Map(prev);
        next.delete(uid);
        return next;
      });
    };

    // Vincula retroativamente se o stream já existe
    if (session.localStream) attachLocal(session.localStream);
  }, [session, isVideo]);

  // Timer rodando enquanto está com pelo menos 1 outro participante
  useEffect(() => {
    if (status === "joined" && remotes.size > 0 && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    }
    return () => {
      if (timerRef.current && (status !== "joined" || remotes.size === 0)) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, remotes.size]);

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

  const groupName = chat?.name || "Chamada em grupo";
  const participantCount = remotes.size + 1; // +1 = eu
  const hasError = Boolean(error);

  const statusLabel = (() => {
    if (error) return error;
    if (status === "connecting") return "Conectando...";
    if (status === "ended") return "Chamada encerrada";
    if (status === "failed") return "Falha na conexão";
    if (remotes.size === 0) return "Aguardando outros entrarem...";
    return formatTime(elapsedSec);
  })();

  return createPortal(
    <div className="fixed inset-0 bg-slate-900 z-[80] flex flex-col text-white">
      <header className="p-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur shrink-0 flex items-center gap-3">
        <Avatar src={chat?.photoURL} name={groupName} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{groupName}</p>
          <p
            className={`text-xs truncate ${
              hasError ? "text-red-400" : "text-slate-400"
            }`}
          >
            {statusLabel}
            {!hasError && (
              <span className="ml-2 text-slate-500">
                · {participantCount} participante
                {participantCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
      </header>

      {hasError ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300 text-center">
            <p className="font-medium mb-1">Não foi possível conectar</p>
            <p className="opacity-90">{error}</p>
            <p className="text-xs text-red-400/70 mt-2">
              Verifique permissões de microfone/câmera no navegador.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <div
            className={`grid gap-3 ${
              participantCount <= 2
                ? "grid-cols-1 md:grid-cols-2"
                : participantCount <= 4
                ? "grid-cols-2"
                : "grid-cols-2 md:grid-cols-3"
            }`}
          >
            {/* Tile local */}
            <LocalTile
              videoRef={localVideoRef}
              isVideo={isVideo && !videoOff}
              userName="Você"
              userPhoto={session?.currentUser?.photoURL}
            />

            {/* Tiles remotos */}
            {Array.from(remotes.entries()).map(([uid, { stream, peerInfo }]) => (
              <RemoteTile
                key={uid}
                stream={stream}
                peerInfo={peerInfo}
                isVideo={isVideo}
              />
            ))}
          </div>
        </div>
      )}

      <footer className="p-6 pb-10 flex items-center justify-center gap-4 shrink-0 bg-slate-950/30 backdrop-blur border-t border-slate-800">
        {!hasError && (
          <button
            type="button"
            onClick={handleMute}
            className={`p-4 rounded-full transition ${
              muted
                ? "bg-white text-slate-900"
                : "bg-white/15 hover:bg-white/25 text-white"
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
                : "bg-white/15 hover:bg-white/25 text-white"
            }`}
            title={videoOff ? "Ativar vídeo" : "Desativar vídeo"}
            aria-label={videoOff ? "Ativar vídeo" : "Desativar vídeo"}
          >
            {videoOff ? <VideoOffIcon /> : <VideoIcon />}
          </button>
        )}

        <button
          type="button"
          onClick={onLeave}
          className="p-5 bg-red-500 hover:bg-red-600 rounded-full transition shadow-xl"
          title={hasError ? "Fechar" : "Sair da chamada"}
          aria-label={hasError ? "Fechar" : "Sair da chamada"}
        >
          <HangupIcon />
        </button>
      </footer>
    </div>,
    document.body
  );
}

function LocalTile({ videoRef, isVideo, userName, userPhoto }) {
  return (
    <div className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
      {isVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : (
        <Avatar src={userPhoto} name={userName} size={96} />
      )}
      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-xs">
        {userName}
      </div>
    </div>
  );
}

function RemoteTile({ stream, peerInfo, isVideo }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const name = peerInfo?.displayName || peerInfo?.email || "Participante";

  useEffect(() => {
    if (videoRef.current && isVideo && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => {});
    }
  }, [stream, isVideo]);

  return (
    <div className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
      <audio ref={audioRef} autoPlay playsInline />
      {isVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <Avatar src={peerInfo?.photoURL} name={name} size={96} />
      )}
      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-xs">
        {name}
      </div>
    </div>
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

export default GroupCallScreen;
