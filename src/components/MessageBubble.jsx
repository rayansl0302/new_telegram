import { useState } from "react";
import MediaLightbox from "./MediaLightbox";

function MessageBubble({ message, isOwn, isGroup, senderInfo }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

      {lightboxOpen && message.imageUrl && (
        <MediaLightbox
          src={message.imageUrl}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

// Regex captura http(s)://... e também www....
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"]+)/gi;

// Pontuação que pode "vazar" pro final da URL e queremos manter fora do link
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
