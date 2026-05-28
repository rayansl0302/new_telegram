import Avatar from "./Avatar";

function ChatListItem({ chat, currentUserId, isSelected, isUnread, onClick }) {
  const isGroup = chat.type === "group";
  const { name, photoURL, lastMessageText } = getDisplay(
    chat,
    currentUserId,
    isGroup
  );
  const time = formatTime(chat.lastMessage?.createdAt);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 hover:bg-slate-900 transition text-left ${
        isSelected ? "bg-slate-900" : ""
      }`}
    >
      <Avatar src={photoURL} name={name} size={48} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <p
            className={`truncate flex items-center gap-1.5 ${
              isUnread ? "font-bold" : "font-semibold"
            }`}
          >
            {name}
            {isGroup && <GroupBadge />}
          </p>
          <span
            className={`text-xs flex-shrink-0 ml-2 ${
              isUnread ? "text-sky-400 font-semibold" : "text-slate-500"
            }`}
          >
            {time}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p
            className={`text-sm truncate flex-1 ${
              isUnread ? "text-white font-medium" : "text-slate-400"
            }`}
          >
            {lastMessageText}
          </p>
          {isUnread && (
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 flex-shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
}

function getDisplay(chat, currentUserId, isGroup) {
  if (isGroup) {
    const name = chat.name || "Grupo sem nome";
    const photoURL = chat.photoURL;

    let lastMessageText;
    if (chat.lastMessage) {
      const senderId = chat.lastMessage.senderId;
      const isOwn = senderId === currentUserId;
      const senderName = isOwn
        ? "Você"
        : (chat.participantInfo?.[senderId]?.displayName || "Alguém").split(" ")[0];
      lastMessageText = `${senderName}: ${chat.lastMessage.text}`;
    } else {
      lastMessageText = `${chat.participants.length} membros`;
    }
    return { name, photoURL, lastMessageText };
  }

  const otherId = chat.participants.find((p) => p !== currentUserId);
  const info = chat.participantInfo?.[otherId] || {};
  return {
    name: info.displayName || info.email || "Usuário",
    photoURL: info.photoURL,
    lastMessageText: chat.lastMessage?.text || "Nenhuma mensagem ainda",
  };
}

function GroupBadge() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-500 flex-shrink-0"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function formatTime(timestamp) {
  if (!timestamp?.toDate) return "";
  const date = timestamp.toDate();
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default ChatListItem;
