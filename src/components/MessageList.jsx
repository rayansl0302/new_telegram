import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

function MessageList({ messages, currentUserId, loading, chat }) {
  const bottomRef = useRef(null);
  const isGroup = chat?.type === "group";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((msg) => {
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
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;
