import Avatar from "./Avatar";

function ChatHeader({ chat, currentUserId, onBack, onOpenGroupSettings }) {
  const isGroup = chat.type === "group";

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

  if (isGroup) {
    const name = chat.name || "Grupo sem nome";
    const memberCount = chat.participants.length;
    return (
      <header className="px-3 md:px-4 py-2 md:py-3 border-b border-slate-800 flex items-center gap-2 md:gap-3 bg-slate-950/95 backdrop-blur shrink-0 pt-[env(safe-area-inset-top)] md:pt-3">
        {backButton}
        <button
          type="button"
          onClick={onOpenGroupSettings}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition"
          title="Configurações do grupo"
        >
          <Avatar src={chat.photoURL} name={name} size={40} />
          <div className="min-w-0">
            <p className="font-semibold truncate">{name}</p>
            <p className="text-xs text-slate-500 truncate">
              {memberCount} {memberCount === 1 ? "membro" : "membros"}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={onOpenGroupSettings}
          className="hidden md:flex p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex-shrink-0"
          title="Configurações do grupo"
          aria-label="Configurações do grupo"
        >
          <SettingsIcon />
        </button>
      </header>
    );
  }

  const otherId = chat.participants.find((p) => p !== currentUserId);
  const otherInfo = chat.participantInfo?.[otherId] || {};
  const name = otherInfo.displayName || otherInfo.email || "Usuário";

  return (
    <header className="px-3 md:px-4 py-2 md:py-3 border-b border-slate-800 flex items-center gap-2 md:gap-3 bg-slate-950/95 backdrop-blur shrink-0 pt-[env(safe-area-inset-top)] md:pt-3">
      {backButton}
      <Avatar src={otherInfo.photoURL} name={name} size={40} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{name}</p>
        <p className="text-xs text-slate-500 truncate hidden sm:block">
          {otherInfo.email}
        </p>
      </div>
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

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default ChatHeader;
