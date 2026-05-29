import { useEffect } from "react";
import { createPortal } from "react-dom";
import Avatar from "./Avatar";

function MessageInfoModal({ message, chat, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const senderId = message.senderId;
  const otherParticipants = (chat.participants || []).filter(
    (p) => p !== senderId
  );
  const msgMs = message.createdAt?.toMillis?.() || 0;
  const deliveredTo = message.deliveredTo || [];
  const lastRead = chat.lastRead || {};

  const readBy = [];
  const deliveredOnly = [];
  const pending = [];

  for (const uid of otherParticipants) {
    const info = chat.participantInfo?.[uid] || {};
    const readTs = lastRead[uid];
    const readMs = readTs?.toMillis?.() || 0;
    const memberObj = { uid, ...info };
    if (msgMs && readMs >= msgMs) {
      readBy.push({ ...memberObj, readAt: readTs });
    } else if (deliveredTo.includes(uid)) {
      deliveredOnly.push(memberObj);
    } else {
      pending.push(memberObj);
    }
  }

  const preview =
    message.text ||
    (message.imageUrl
      ? "[Imagem]"
      : message.audioUrl
      ? "[Áudio]"
      : "[Mensagem vazia]");

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="msg-info-title"
    >
      <div
        className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 py-3 border-b border-slate-700 flex items-center justify-between shrink-0">
          <h2 id="msg-info-title" className="text-lg font-semibold">
            Dados da mensagem
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
            aria-label="Fechar"
            title="Fechar (Esc)"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Sua mensagem</p>
            <p className="text-sm text-slate-200 break-words line-clamp-3">
              {preview}
            </p>
          </div>

          {readBy.length > 0 && (
            <Section
              title="Lida por"
              count={readBy.length}
              icon={<DoubleTick className="text-cyan-300" />}
            >
              {readBy.map((m) => (
                <MemberRow
                  key={m.uid}
                  member={m}
                  timestamp={m.readAt}
                  timeLabel="Lida"
                />
              ))}
            </Section>
          )}

          {deliveredOnly.length > 0 && (
            <Section
              title="Entregue para"
              count={deliveredOnly.length}
              icon={<DoubleTick className="text-slate-400" />}
            >
              {deliveredOnly.map((m) => (
                <MemberRow key={m.uid} member={m} />
              ))}
            </Section>
          )}

          {pending.length > 0 && (
            <Section
              title="Pendente"
              count={pending.length}
              icon={<SingleTick className="text-slate-400" />}
            >
              {pending.map((m) => (
                <MemberRow key={m.uid} member={m} />
              ))}
            </Section>
          )}

          {readBy.length === 0 &&
            deliveredOnly.length === 0 &&
            pending.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-500 text-center">
                Nenhum outro participante neste chat.
              </p>
            )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Section({ title, count, icon, children }) {
  return (
    <section className="border-b border-slate-700 last:border-b-0">
      <header className="px-4 pt-3 pb-1 flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
        {icon}
        <span>{title}</span>
        <span className="text-slate-500 normal-case tracking-normal">
          ({count})
        </span>
      </header>
      <div className="pb-2">{children}</div>
    </section>
  );
}

function MemberRow({ member, timestamp, timeLabel }) {
  const name = member.displayName || member.email || "Usuário";
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <Avatar src={member.photoURL} name={name} size={40} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-slate-100">{name}</p>
        <p className="text-xs text-slate-500 truncate">
          {timestamp
            ? `${timeLabel || ""} ${formatDateTime(timestamp)}`.trim()
            : member.email}
        </p>
      </div>
    </div>
  );
}

function formatDateTime(timestamp) {
  if (!timestamp?.toDate) return "";
  const d = timestamp.toDate();
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (sameDay) return `hoje às ${time}`;
  if (isYesterday) return `ontem às ${time}`;
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " às " +
    time
  );
}

function CloseIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SingleTick({ className }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 10 7 14 15 4" />
    </svg>
  );
}

function DoubleTick({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="14"
      viewBox="0 0 24 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="2 10 6 14 14 4" />
      <polyline points="9 10 13 14 23 4" />
    </svg>
  );
}

export default MessageInfoModal;
