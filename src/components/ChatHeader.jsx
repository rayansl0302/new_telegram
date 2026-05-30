import { useCall } from "../context/CallContext";
import Avatar from "./Avatar";

function ChatHeader({
  chat,
  currentUserId,
  onBack,
  onOpenInfo,
  onToggleSearch,
  searchActive,
}) {
  const isGroup = chat.type === "group";
  const { startCall, activeCall } = useCall();

  let name, photoURL, subtitle, otherInfo, otherId;
  if (isGroup) {
    name = chat.name || "Grupo sem nome";
    photoURL = chat.photoURL;
    const count = chat.participants.length;
    subtitle = `${count} ${count === 1 ? "membro" : "membros"}`;
  } else {
    otherId = chat.participants.find((p) => p !== currentUserId);
    otherInfo = chat.participantInfo?.[otherId] || {};
    name = otherInfo.displayName || otherInfo.email || "Usuário";
    photoURL = otherInfo.photoURL;
    subtitle = otherInfo.email;
  }

  const handleCall = (type) => {
    if (isGroup || !otherId) return;
    if (activeCall) {
      alert("Você já está em uma chamada.");
      return;
    }
    startCall(
      {
        uid: otherId,
        displayName: otherInfo.displayName,
        email: otherInfo.email,
        photoURL: otherInfo.photoURL,
      },
      type
    );
  };

  const backButton = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className="md:hidden p-2 -ml-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition flex-shrink-0"
      aria-label="Voltar para conversas"
    >
      <BackIcon />
    </button>
  ) : null;

  return (
    <header className="px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-800 flex items-center gap-2 md:gap-3 bg-slate-950/95 backdrop-blur shrink-0">
      {backButton}
      <button
        type="button"
        onClick={onOpenInfo}
        className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition"
        title={isGroup ? "Dados do grupo" : "Dados do contato"}
      >
        <Avatar src={photoURL} name={name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{name}</p>
          <p className="text-xs text-slate-500 truncate">{subtitle}</p>
        </div>
      </button>

      {!isGroup && (
        <>
          <button
            type="button"
            onClick={() => handleCall("audio")}
            disabled={Boolean(activeCall)}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Chamada de voz"
            aria-label="Iniciar chamada de voz"
          >
            <PhoneIcon />
          </button>
          <button
            type="button"
            onClick={() => handleCall("video")}
            disabled={Boolean(activeCall)}
            className="p-2 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Chamada de vídeo"
            aria-label="Iniciar chamada de vídeo"
          >
            <VideoIcon />
          </button>
        </>
      )}

      {onToggleSearch && (
        <button
          type="button"
          onClick={onToggleSearch}
          className={`p-2 rounded-lg transition flex-shrink-0 ${
            searchActive
              ? "bg-sky-500/15 text-sky-400"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          title="Buscar nesta conversa"
          aria-label="Buscar nesta conversa"
          aria-pressed={searchActive ? "true" : "false"}
        >
          <SearchIcon />
        </button>
      )}
    </header>
  );
}

function BackIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function PhoneIcon() {
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
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function VideoIcon() {
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
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function SearchIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default ChatHeader;
