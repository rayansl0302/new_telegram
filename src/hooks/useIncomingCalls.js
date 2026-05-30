import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * Escuta chamadas recebidas em estado "ringing" para o usuário atual.
 * Retorna o primeiro doc encontrado (ou null).
 */
export function useIncomingCalls(userId) {
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (!userId) {
      setIncomingCall(null);
      return;
    }

    const q = query(
      collection(db, "calls"),
      where("calleeId", "==", userId),
      where("status", "==", "ringing")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs;
        if (docs.length > 0) {
          const docSnap = docs[0];
          setIncomingCall({ id: docSnap.id, ...docSnap.data() });
        } else {
          setIncomingCall(null);
        }
      },
      (err) => {
        console.error("useIncomingCalls error:", err);
      }
    );

    return unsubscribe;
  }, [userId]);

  return incomingCall;
}
