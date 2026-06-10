import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import SystemMessage from "./SystemMessage";
import {
  getSelectedMessageElements,
  formatMessagesAsWhatsApp,
} from "../utils/copyFormat";

function MessageList({
  messages,
  currentUserId,
  loading,
  chat,
  onReply,
  matchedIds,
  currentMatchId,
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const isGroup = chat?.type === "group";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Intercepta Ctrl+C / copy: se uma ou mais mensagens estão na seleção,
  // formata estilo WhatsApp ([HH:MM, DD/MM/YYYY] Nome: texto). Seleções
  // que não tocam nenhuma mensagem caem no comportamento padrão.
  const handleCopy = (e) => {
    const container = containerRef.current;
    if (!container) return;
    const selected = getSelectedMessageElements(container);
    if (selected.length === 0) return;
    const text = formatMessagesAsWhatsApp(selected);
    if (!text) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", text);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        Carregando mensagens...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        Nenhuma mensagem ainda. Envie a primeira!
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onCopy={handleCopy}
      className="flex-1 overflow-y-auto p-4 space-y-2"
    >
      {messages.map((msg) => {
        if (msg.system) {
          return <SystemMessage key={msg.id} message={msg} />;
        }
        const isOwn = msg.senderId === currentUserId;
        const senderInfo =
          isGroup && !isOwn ? chat.participantInfo?.[msg.senderId] : null;
        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={isOwn}
            isGroup={isGroup}
            senderInfo={senderInfo}
            chat={chat}
            currentUserId={currentUserId}
            onReply={onReply}
            isMatch={matchedIds?.has(msg.id)}
            isCurrentMatch={currentMatchId === msg.id}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;
