import { createContext, useContext, useEffect, useState } from "react";
import { getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../services/firebase";

const AuthContext = createContext(null);

function extractUser(firebaseUser) {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;

    async function initAuth() {
      try {
        await getRedirectResult(auth);
      } catch {
        /* redirect cancelado ou estado inválido — onAuthStateChanged trata */
      }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userRef = doc(db, "users", firebaseUser.uid);
          await setDoc(
            userRef,
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName:
                firebaseUser.displayName || firebaseUser.email.split("@")[0],
              photoURL: firebaseUser.photoURL || null,
              lastSeen: serverTimestamp(),
            },
            { merge: true }
          );
          setUser(extractUser(firebaseUser));
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    }

    initAuth();
    return () => unsubscribe?.();
  }, []);

  const refreshUser = () => {
    setUser(extractUser(auth.currentUser));
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
