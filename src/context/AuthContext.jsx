import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, authPersistenceReady, db } from "../services/firebase";
import { traduzErroAuth } from "../utils/authErrors";

const LAST_SEEN_INTERVAL_MS = 5 * 60 * 1000;

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
  const authReadyRef = useRef(false);
  const lastSyncedUidRef = useRef(null);
  const lastSeenSyncRef = useRef(0);

  const queueUserDocSync = (firebaseUser) => {
    const now = Date.now();
    const isNewUser = lastSyncedUidRef.current !== firebaseUser.uid;
    const shouldUpdateLastSeen =
      isNewUser || now - lastSeenSyncRef.current > LAST_SEEN_INTERVAL_MS;

    if (!shouldUpdateLastSeen) return;

    lastSyncedUidRef.current = firebaseUser.uid;
    lastSeenSyncRef.current = now;

    syncUserDoc(firebaseUser).catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await authPersistenceReady;

      try {
        const result = await getRedirectResult(auth);
        if (!cancelled && result?.user) {
          setUser(extractUser(result.user));
          setRedirectError(null);
          queueUserDocSync(result.user);
        }
      } catch (err) {
        if (!cancelled) {
          setRedirectError(traduzErroAuth(err?.code, err?.message || ""));
        }
      }

      await auth.authStateReady();
      if (cancelled) return;

      authReadyRef.current = true;

      if (auth.currentUser) {
        setUser(extractUser(auth.currentUser));
        queueUserDocSync(auth.currentUser);
      }

      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (cancelled) return;

      if (firebaseUser) {
        setUser(extractUser(firebaseUser));
        setRedirectError(null);
        queueUserDocSync(firebaseUser);
        if (!authReadyRef.current) {
          authReadyRef.current = true;
          setLoading(false);
        }
        return;
      }

      if (!authReadyRef.current) return;

      setUser(null);
      lastSyncedUidRef.current = null;
    });

    init();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const refreshUser = () => {
    setUser(extractUser(auth.currentUser));
  };

  const logout = async () => {
    lastSyncedUidRef.current = null;
    lastSeenSyncRef.current = 0;
    await signOut(auth);
  };

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
