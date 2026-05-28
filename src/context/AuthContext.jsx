import { createContext, useContext, useEffect, useState } from "react";
import { getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { traduzErroAuth } from "../utils/authErrors";

const defaultAuthValue = {
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: () => {},
  redirectError: null,
  clearRedirectError: () => {},
};

const AuthContext = createContext(defaultAuthValue);

function extractUser(firebaseUser) {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
}

async function syncUserDoc(firebaseUser) {
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
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await syncUserDoc(firebaseUser);
        } catch {
          /* Firestore indisponível — mantém sessão local */
        }
        setUser(extractUser(firebaseUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    getRedirectResult(auth)
      .then(() => setRedirectError(null))
      .catch((err) => {
        setRedirectError(traduzErroAuth(err?.code, err?.message || ""));
      });

    return unsubscribe;
  }, []);

  const refreshUser = () => {
    setUser(extractUser(auth.currentUser));
  };

  const logout = () => signOut(auth);

  const clearRedirectError = () => setRedirectError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        refreshUser,
        redirectError,
        clearRedirectError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
