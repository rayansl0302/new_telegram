import { useState } from "react";
import MediaLightbox from "./MediaLightbox";

function MessageBubble({
  message,
  isOwn,
  isGroup,
  senderInfo,
  onReply,
  isMatch,
  isCurrentMatch,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const time = formatMessageTime(message.createdAt);
  const showSender = isGroup && !isOwn && senderInfo;
  const senderName =
    senderInfo?.displayName || senderInfo?.email || "Alguém";
  const colorClass = showSender ? colorFromName(senderName) : "";

  const handleQuoteClick = () => {
    if (!message.replyTo?.messageId) return;
    const el = document.getElementById(`msg-${message.replyTo.messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-amber-400");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-amber-400");
      }, 1500);
    }
  };

  const replyButton = onReply ? (
    <button
      type="button"
      onClick={() => onReply(message)}
      className="text-slate-400 hover:text-sky-400 p-1.5 rounded-full opacity-40 hover:opacity-100 transition flex-shrink-0"
      title="Responder"
      aria-label="Responder a esta mensagem"
    >
      <ReplyIcon />
    </button>
  ) : null;

  const bubbleClasses = [
    "max-w-[75%] rounded-2xl px-4 py-2 shadow",
    isOwn
      ? "bg-sky-600 text-white rounded-br-sm"
      : "bg-slate-800 text-white rounded-bl-sm",
    isCurrentMatch ? "ring-2 ring-amber-400" : "",
    isMatch && !isCurrentMatch ? "ring-1 ring-amber-400/60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      id={`msg-${message.id}`}
      className={`flex items-center gap-2 scroll-mt-24 ${
        isOwn ? "justify-end" : "justify-start"
      }`}
    >
      {isOwn && replyButton}

      <div className={bubbleClasses}>
        {message.replyTo && (
          <button
            type="button"
            onClick={handleQuoteClick}
            className="block w-full text-left bg-black/25 border-l-4 border-white/40 rounded px-2 py-1 mb-1.5 hover:bg-black/35 transition"
          >
            <p className="text-xs font-semibold opacity-90 truncate">
              {message.replyTo.senderName || "Alguém"}
            </p>
            <p className="text-xs opacity-70 truncate">
              {message.replyTo.text ||
                (message.replyTo.imageUrl ? "[Imagem]" : "")}
            </p>
          </button>
        )}

        {showSender && (
          <p className={`text-xs font-semibold mb-0.5 ${colorClass}`}>
            {senderName}
          </p>
        )}
        {message.imageUrl && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block w-full"
            aria-label="Ampliar imagem"
          >
            <img
              src={message.imageUrl}
              alt="imagem"
              className="rounded-lg mb-1 max-w-full max-h-80 object-contain hover:opacity-90 transition"
            />
          </button>
        )}
        {message.text && (
          <p className="whitespace-pre-wrap break-words">
            {renderTextWithLinks(message.text, isOwn)}
          </p>
        )}
        <p
          className={`text-[10px] mt-1 text-right ${
            isOwn ? "text-sky-100/70" : "text-slate-400"
          }`}
        >
          {time}
        </p>
      </div>

      {!isOwn && replyButton}

      {lightboxOpen && message.imageUrl && (
        <MediaLightbox
          src={message.imageUrl}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

function ReplyIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

// Regex captura http(s)://... e também www....
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"]+)/gi;
const TRAILING_PUNCT = /[.,!?;:)\]}>'"`]+$/;

function renderTextWithLinks(text, isOwn) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;

    const trailingMatch = part.match(TRAILING_PUNCT);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const cleanUrl = trailing ? part.slice(0, -trailing.length) : part;
    const href = cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`;

    return (
      <span key={i}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className={`underline break-all ${
            isOwn
              ? "text-sky-100 hover:text-white"
              : "text-sky-400 hover:text-sky-300"
          }`}
        >
          {cleanUrl}
        </a>
        {trailing}
      </span>
    );
  });
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
