import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase";

export function useChats(userId) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", userId),
      orderBy("updatedAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setChats(data);
        setLoading(false);
      },
      (err) => {
        console.error("useChats error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [userId]);

  return { chats, loading };
}
