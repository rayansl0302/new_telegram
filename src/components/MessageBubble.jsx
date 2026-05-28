function MessageBubble({ message, isOwn, isGroup, senderInfo }) {
  const time = formatMessageTime(message.createdAt);
  const showSender = isGroup && !isOwn && senderInfo;
  const senderName =
    senderInfo?.displayName || senderInfo?.email || "Alguém";
  const colorClass = showSender ? colorFromName(senderName) : "";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 shadow ${
          isOwn
            ? "bg-sky-600 text-white rounded-br-sm"
            : "bg-slate-800 text-white rounded-bl-sm"
        }`}
      >
        {showSender && (
          <p className={`text-xs font-semibold mb-0.5 ${colorClass}`}>
            {senderName}
          </p>
        )}
        {message.imageUrl && (
          <a href={message.imageUrl} target="_blank" rel="noreferrer">
            <img
              src={message.imageUrl}
              alt="imagem"
              className="rounded-lg mb-1 max-w-full max-h-80 object-contain"
            />
          </a>
        )}
        {message.text && (
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        )}
        <p
          className={`text-[10px] mt-1 text-right ${
            isOwn ? "text-sky-100/70" : "text-slate-400"
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  );
}

const SENDER_COLORS = [
  "text-rose-400",
  "text-amber-400",
  "text-emerald-400",
  "text-cyan-400",
  "text-fuchsia-400",
  "text-orange-400",
  "text-lime-400",
  "text-indigo-400",
];

function colorFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

function formatMessageTime(timestamp) {
  if (!timestamp?.toDate) return "";
  return timestamp.toDate().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default MessageBubble;
