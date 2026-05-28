import { updateProfile } from "firebase/auth";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export const updateUserProfile = async (uid, { displayName, photoURL }) => {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, {
      displayName: displayName || null,
      photoURL: photoURL || null,
    });
  }

  await updateDoc(doc(db, "users", uid), {
    displayName: displayName || null,
    photoURL: photoURL || null,
  });

  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("participants", "array-contains", uid));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, {
      [`participantInfo.${uid}.displayName`]: displayName || null,
      [`participantInfo.${uid}.photoURL`]: photoURL || null,
    });
  });
  await batch.commit();
};
