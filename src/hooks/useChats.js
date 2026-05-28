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
    if (!userId) {
      console.log("[useChats] sem userId, ignorando");
      return;
    }
    console.log("[useChats] inscrevendo p/ userId:", userId);

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
        console.log(
          "[useChats] snapshot:",
          data.length,
          "chats",
          data.map((c) => ({
            id: c.id,
            type: c.type,
            participants: c.participants,
            updatedAt: c.updatedAt,
          }))
        );
        setChats(data);
        setLoading(false);
      },
      (err) => {
        console.error("[useChats] error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [userId]);

  return { chats, loading };
}
