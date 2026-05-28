import Avatar from "./Avatar";

function ChatHeader({ chat, currentUserId }) {
  const isGroup = chat.type === "group";

  if (isGroup) {
    const name = chat.name || "Grupo sem nome";
    const memberCount = chat.participants.length;
    return (
      <header className="px-4 py-3 border-b border-slate-800 flex items-center gap-3 bg-slate-950/50 backdrop-blur">
        <Avatar src={chat.photoURL} name={name} size={40} />
        <div className="min-w-0">
          <p className="font-semibold truncate">{name}</p>
          <p className="text-xs text-slate-500 truncate">
            {memberCount} {memberCount === 1 ? "membro" : "membros"}
          </p>
        </div>
      </header>
    );
  }

  const otherId = chat.participants.find((p) => p !== currentUserId);
  const otherInfo = chat.participantInfo?.[otherId] || {};
  const name = otherInfo.displayName || otherInfo.email || "Usuário";

  return (
    <header className="px-4 py-3 border-b border-slate-800 flex items-center gap-3 bg-slate-950/50 backdrop-blur">
      <Avatar src={otherInfo.photoURL} name={name} size={40} />
      <div className="min-w-0">
        <p className="font-semibold truncate">{name}</p>
        <p className="text-xs text-slate-500 truncate">{otherInfo.email}</p>
      </div>
    </header>
  );
}

export default ChatHeader;
