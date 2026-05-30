import { useEffect, useState } from "react";
import MediaLightbox from "./MediaLightbox";
import MessageInfoModal from "./MessageInfoModal";
import {
  setMessageReaction,
  removeMessageReaction,
} from "../services/chatService";

const PICKER_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function MessageBubble({
  message,
  isOwn,
  isGroup,
  senderInfo,
  chat,
  currentUserId,
  onReply,
  isMatch,
  isCurrentMatch,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const time = formatMessageTime(message.createdAt);
  const showSender = isGroup && !isOwn && senderInfo;
  const senderName =
    senderInfo?.displayName || senderInfo?.email || "Alguém";
  const colorClass = showSender ? colorFromName(senderName) : "";

  const readStatus = isOwn ? computeReadStatus(message, chat) : null;
  const canSeeMessageInfo = isOwn && isGroup && !message.system;

  const reactions = message.reactions || {};
  const myReaction = currentUserId ? reactions[currentUserId] : null;
  const reactionCounts = aggregateReactions(reactions);
  const hasReactions = Object.keys(reactionCounts).length > 0;

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

  const handlePickReaction = async (emoji) => {
    setPickerOpen(false);
    if (!chat?.id || !currentUserId) return;
    try {
      if (myReaction === emoji) {
        await removeMessageReaction(chat.id, message.id, currentUserId);
      } else {
        await setMessageReaction(chat.id, message.id, currentUserId, emoji);
      }
    } catch (err) {
      console.error("reaction failed:", err);
    }
  };

  const handleToggleReaction = async (emoji) => {
    if (!chat?.id || !currentUserId) return;
    try {
      if (myReaction === emoji) {
        await removeMessageReaction(chat.id, message.id, currentUserId);
      } else {
        await setMessageReaction(chat.id, message.id, currentUserId, emoji);
      }
    } catch (err) {
      console.error("reaction failed:", err);
    }
  };

  const infoButton = canSeeMessageInfo ? (
    <button
      type="button"
      onClick={() => setInfoOpen(true)}
      className="text-slate-400 hover:text-cyan-400 p-1 md:p-1.5 rounded-full opacity-50 hover:opacity-100 transition flex-shrink-0"
      title="Dados da mensagem"
      aria-label="Ver quem visualizou esta mensagem"
    >
      <InfoIcon />
    </button>
  ) : null;

  const reactionButton = chat && currentUserId && !message.system ? (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPickerOpen((s) => !s)}
        className={`p-1 md:p-1.5 rounded-full transition flex-shrink-0 ${
          pickerOpen
            ? "text-amber-400 opacity-100 bg-amber-500/10"
            : "text-slate-400 hover:text-amber-400 opacity-50 hover:opacity-100"
        }`}
        title="Reagir"
        aria-label="Reagir a esta mensagem"
        aria-expanded={pickerOpen}
      >
        <SmileyIcon />
      </button>
      {pickerOpen && (
        <EmojiReactionPicker
          onSelect={handlePickReaction}
          onClose={() => setPickerOpen(false)}
          alignRight={isOwn}
          myReaction={myReaction}
        />
      )}
    </div>
  ) : null;

  const replyButton = onReply ? (
    <button
      type="button"
      onClick={() => onReply(message)}
      className="text-slate-400 hover:text-sky-400 p-1 md:p-1.5 rounded-full opacity-50 hover:opacity-100 transition flex-shrink-0"
      title="Responder"
      aria-label="Responder a esta mensagem"
    >
      <ReplyIcon />
    </button>
  ) : null;

  const bubbleClasses = [
    "rounded-2xl px-4 py-2 shadow",
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
      className={`flex items-center gap-0.5 md:gap-1 scroll-mt-24 ${
        isOwn ? "justify-end" : "justify-start"
      }`}
    >
      {isOwn && (
        <>
          {infoButton}
          {reactionButton}
          {replyButton}
        </>
      )}

      <div
        className={`flex flex-col max-w-[75%] min-w-0 gap-1 ${
          isOwn ? "items-end" : "items-start"
        }`}
      >
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
          {message.audioUrl && (
            <audio
              controls
              src={message.audioUrl}
              className="my-1 max-w-[260px] h-10"
            />
          )}
          {message.file && <FileCard file={message.file} />}
          {message.text && (
            <p className="whitespace-pre-wrap break-words">
              {renderTextWithLinks(message.text, isOwn)}
            </p>
          )}

          <div className="flex items-center justify-end gap-1 mt-1">
            <span
              className={`text-[10px] ${
                isOwn ? "text-sky-100/70" : "text-slate-400"
              }`}
            >
              {time}
            </span>
            {readStatus && <TickIcon status={readStatus} />}
          </div>
        </div>

        {hasReactions && (
          <ReactionPills
            counts={reactionCounts}
            myReaction={myReaction}
            onToggle={handleToggleReaction}
          />
        )}
      </div>

      {!isOwn && (
        <>
          {reactionButton}
          {replyButton}
        </>
      )}

      {lightboxOpen && message.imageUrl && (
        <MediaLightbox
          src={message.imageUrl}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {infoOpen && canSeeMessageInfo && chat && (
        <MessageInfoModal
          message={message}
          chat={chat}
          onClose={() => setInfoOpen(false)}
        />
      )}
    </div>
  );
}

// --- Reações ---

function aggregateReactions(reactions) {
  const counts = {};
  for (const [, emoji] of Object.entries(reactions || {})) {
    if (!emoji) continue;
    counts[emoji] = (counts[emoji] || 0) + 1;
  }
  return counts;
}

function ReactionPills({ counts, myReaction, onToggle }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Object.entries(counts).map(([emoji, count]) => {
        const isMine = myReaction === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            className={`text-xs flex items-center gap-1 rounded-full px-2 py-0.5 border transition ${
              isMine
                ? "bg-sky-500/25 border-sky-400 text-sky-100"
                : "bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-600"
            }`}
            title={isMine ? "Remover sua reação" : "Reagir"}
          >
            <span className="text-sm leading-none">{emoji}</span>
            {count > 1 && <span className="font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function EmojiReactionPicker({ onSelect, onClose, alignRight, myReaction }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`absolute z-40 bottom-full mb-2 bg-slate-800 rounded-full p-1 flex gap-0.5 shadow-xl border border-slate-700 whitespace-nowrap ${
          alignRight ? "right-0" : "left-0"
        }`}
        role="menu"
      >
        {PICKER_EMOJIS.map((emoji) => {
          const isSelected = myReaction === emoji;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className={`text-xl hover:scale-125 transition px-1.5 py-1 leading-none rounded-full ${
                isSelected ? "bg-sky-500/30" : ""
              }`}
              title={`Reagir com ${emoji}`}
              role="menuitem"
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </>
  );
}

// --- Status de leitura ---

function computeReadStatus(message, chat) {
  if (!chat || message.system) return null;
  const senderId = message.senderId;
  if (!senderId) return null;

  const recipients = (chat.participants || []).filter((p) => p !== senderId);
  if (recipients.length === 0) return "sent";

  const msgMs = message.createdAt?.toMillis?.();
  if (!msgMs) return "sent";

  const lastRead = chat.lastRead || {};
  const deliveredTo = message.deliveredTo || [];

  const allRead = recipients.every((uid) => {
    const readMs = lastRead[uid]?.toMillis?.() || 0;
    return readMs >= msgMs;
  });
  if (allRead) return "read";

  const allDelivered = recipients.every((uid) => deliveredTo.includes(uid));
  if (allDelivered) return "delivered";

  return "sent";
}

function TickIcon({ status }) {
  const isRead = status === "read";
  const isDouble = status === "delivered" || status === "read";
  const colorClass = isRead ? "text-cyan-300" : "text-sky-100/70";

  return (
    <span
      className={`inline-flex items-center ${colorClass}`}
      title={isRead ? "Lido" : isDouble ? "Entregue" : "Enviado"}
      aria-label={isRead ? "Lido" : isDouble ? "Entregue" : "Enviado"}
    >
      {isDouble ? <DoubleTick /> : <SingleTick />}
    </span>
  );
}

function SingleTick() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 10 7 14 15 4" />
    </svg>
  );
}

function DoubleTick() {
  return (
    <svg
      width="18"
      height="14"
      viewBox="0 0 24 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="2 10 6 14 14 4" />
      <polyline points="9 10 13 14 23 4" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function SmileyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]"
    >
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

// --- File card (PDF, XML, DOC, etc.) ---

function FileCard({ file }) {
  const downloadUrl = buildDownloadUrl(file.url);

  return (
    <div className="flex items-center gap-3 bg-black/25 rounded-lg px-3 py-2 my-1 min-w-[240px] max-w-full">
      <FileBadge name={file.name} />
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer noopener"
        className="flex-1 min-w-0 hover:underline"
        title={file.name}
      >
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs opacity-70">{formatFileSize(file.size)}</p>
      </a>
      <a
        href={downloadUrl}
        target="_blank"
        rel="noreferrer noopener"
        download={file.name}
        className="p-1.5 rounded-full hover:bg-white/15 transition opacity-80 hover:opacity-100 flex-shrink-0"
        title="Baixar"
        aria-label="Baixar arquivo"
        onClick={(e) => e.stopPropagation()}
      >
        <DownloadIcon />
      </a>
    </div>
  );
}

function FileBadge({ name }) {
  const ext = (name?.split(".").pop() || "").toLowerCase();
  const label = ext ? ext.toUpperCase().slice(0, 4) : "FILE";
  const color = fileBadgeColor(ext);
  return (
    <div
      className={`w-11 h-12 rounded-md flex flex-col items-center justify-center text-white shadow flex-shrink-0 ${color}`}
    >
      <FileGlyph />
      <span className="text-[9px] font-bold leading-none mt-0.5 tracking-wide">
        {label}
      </span>
    </div>
  );
}

function fileBadgeColor(ext) {
  switch (ext) {
    case "pdf":
      return "bg-red-500";
    case "doc":
    case "docx":
    case "odt":
      return "bg-blue-500";
    case "xls":
    case "xlsx":
    case "csv":
    case "ods":
      return "bg-emerald-500";
    case "ppt":
    case "pptx":
    case "odp":
      return "bg-orange-500";
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return "bg-amber-500";
    case "xml":
    case "json":
    case "yaml":
    case "yml":
      return "bg-cyan-500";
    case "txt":
    case "md":
      return "bg-slate-500";
    default:
      return "bg-slate-500";
  }
}

function FileGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="white"
      opacity="0.85"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" fill="rgba(0,0,0,0.2)" />
    </svg>
  );
}

function DownloadIcon() {
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
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function buildDownloadUrl(url) {
  if (typeof url !== "string") return url;
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  return url;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// --- Linkify e cores ---

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
