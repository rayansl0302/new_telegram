import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * Retorna a chamada em grupo ativa para um chatId (se houver), e null caso
 * contrário. Re-renderiza quando alguém entra/sai ou quando a chamada termina.
 */
export function useGroupCallStatus(chatId) {
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    if (!chatId) {
      setActiveCall(null);
      return;
    }

    const q = query(
      collection(db, "groupCalls"),
      where("chatId", "==", chatId),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setActiveCall(null);
          return;
        }
        // Pega a mais recente (primeira do snapshot)
        const docSnap = snapshot.docs[0];
        setActiveCall({ id: docSnap.id, ...docSnap.data() });
      },
      (err) => {
        console.error("useGroupCallStatus error:", err);
        setActiveCall(null);
      }
    );

    return unsubscribe;
  }, [chatId]);

  return activeCall;
}
