import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../hooks/useMessages";
import { markChatAsRead } from "../services/chatService";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import EmptyChat from "./EmptyChat";

function ChatWindow({ chat }) {
  const { user } = useAuth();
  const { messages, loading } = useMessages(chat?.id);

  useEffect(() => {
    if (!chat?.id || !user?.uid) return;
    markChatAsRead(chat.id, user.uid).catch((err) =>
      console.error("markChatAsRead:", err)
    );
  }, [chat?.id, user?.uid, messages.length]);

  if (!chat) return <EmptyChat />;

  return (
    <main className="flex-1 flex flex-col bg-slate-900">
      <ChatHeader chat={chat} currentUserId={user.uid} />
      <MessageList
        messages={messages}
        currentUserId={user.uid}
        loading={loading}
        chat={chat}
      />
      <MessageInput chatId={chat.id} senderId={user.uid} />
    </main>
  );
}

export default ChatWindow;
