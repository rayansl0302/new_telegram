import { useEffect, useState } from "react";
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { auth, db } from "../services/firebase";

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

        // Marca mensagens recebidas como "delivered" para o usuário atual.
        // Isso permite mostrar o segundo tick (entregue) ao remetente.
        const currentUid = auth.currentUser?.uid;
        if (!currentUid) return;

        for (const msg of data) {
          if (msg.system) continue;
          if (msg.senderId === currentUid) continue;
          const delivered = msg.deliveredTo || [];
          if (delivered.includes(currentUid)) continue;
          const msgRef = doc(db, "chats", chatId, "messages", msg.id);
          updateDoc(msgRef, {
            deliveredTo: arrayUnion(currentUid),
          }).catch((err) => {
            // Pode falhar por regras ou rede; tudo bem, só não marcará como entregue.
            console.warn("markDelivered falhou:", err?.code || err);
          });
        }
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
