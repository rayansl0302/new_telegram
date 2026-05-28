import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

export function useMessages(chatId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(data);
        setLoading(false);
      },
      (err) => {
        console.error("useMessages error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [chatId]);

  return { messages, loading };
}
