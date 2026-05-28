import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../hooks/useMessages";
import { markChatAsRead } from "../services/chatService";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import EmptyChat from "./EmptyChat";
import GroupInfoPanel from "./GroupInfoPanel";

function ChatWindow({ chat, onBack, onGroupLeft }) {
  const { user } = useAuth();
  const { messages, loading } = useMessages(chat?.id);
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  useEffect(() => {
    setShowGroupSettings(false);
  }, [chat?.id]);

  useEffect(() => {
    if (!chat?.id || !user?.uid) return;
    markChatAsRead(chat.id, user.uid).catch((err) =>
      console.error("markChatAsRead:", err)
    );
  }, [chat?.id, user?.uid, messages.length]);

  if (!chat) return <EmptyChat />;

  const isGroup = chat.type === "group";
  const showPanel = showGroupSettings && isGroup;

  return (
    <main className="flex-1 flex min-h-0 bg-slate-900">
      <div
        className={`flex-1 flex-col min-h-0 bg-slate-900 ${
          showPanel ? "hidden md:flex" : "flex"
        }`}
      >
        <ChatHeader
          chat={chat}
          currentUserId={user.uid}
          onBack={onBack}
          onOpenGroupSettings={
            isGroup ? () => setShowGroupSettings(true) : undefined
          }
        />
        <MessageList
          messages={messages}
          currentUserId={user.uid}
          loading={loading}
          chat={chat}
        />
        <MessageInput chatId={chat.id} senderId={user.uid} />
      </div>

      {showPanel && (
        <GroupInfoPanel
          chat={chat}
          onClose={() => setShowGroupSettings(false)}
          onLeftGroup={onGroupLeft}
        />
      )}
    </main>
  );
}

export default ChatWindow;
