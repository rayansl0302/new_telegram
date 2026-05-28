import { createContext, useContext, useEffect, useRef, useState } from "react";
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

async function applySession(firebaseUser) {
  if (!firebaseUser) return null;
  try {
    await syncUserDoc(firebaseUser);
  } catch {
    /* Firestore offline — mantém login local */
  }
  return extractUser(firebaseUser);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState(null);
  const redirectCheckedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function checkRedirect() {
      try {
        const result = await getRedirectResult(auth);
        if (cancelled) return;
        if (result?.user) {
          const sessionUser = await applySession(result.user);
          if (!cancelled && sessionUser) {
            setUser(sessionUser);
            setRedirectError(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setRedirectError(traduzErroAuth(err?.code, err?.message || ""));
        }
      } finally {
        redirectCheckedRef.current = true;
        if (cancelled) return;

        const current = auth.currentUser;
        if (current) {
          applySession(current).then((sessionUser) => {
            if (!cancelled && sessionUser) setUser(sessionUser);
            if (!cancelled) setLoading(false);
          });
        } else {
          setLoading(false);
        }
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;

      if (firebaseUser) {
        const sessionUser = await applySession(firebaseUser);
        if (!cancelled && sessionUser) {
          setUser(sessionUser);
          setRedirectError(null);
          setLoading(false);
        }
        return;
      }

      if (!redirectCheckedRef.current) return;

      if (!cancelled) {
        setUser(null);
        setLoading(false);
      }
    });

    checkRedirect();

    return () => {
      cancelled = true;
      unsubscribe();
    };
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
