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

  let name, photoURL, subtitle;
  if (isGroup) {
    name = chat.name || "Grupo sem nome";
    photoURL = chat.photoURL;
    const count = chat.participants.length;
    subtitle = `${count} ${count === 1 ? "membro" : "membros"}`;
  } else {
    const otherId = chat.participants.find((p) => p !== currentUserId);
    const info = chat.participantInfo?.[otherId] || {};
    name = info.displayName || info.email || "Usuário";
    photoURL = info.photoURL;
    subtitle = info.email;
  }

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
