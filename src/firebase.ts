// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, ref, push, set, get } from "firebase/database";
import type * as Storyboard from "./weaver/storyboard";

const firebaseConfig = {
  apiKey: "AIzaSyCPPVAnF20YkqizR5XbgprhM_lGka-FcmM",
  authDomain: "frameplanner-e5569.firebaseapp.com",
  databaseURL: "https://frameplanner-e5569-default-rtdb.firebaseio.com",
  projectId: "frameplanner-e5569",
  storageBucket: "frameplanner-e5569.appspot.com",
  messagingSenderId: "415667920948",
  appId: "1:415667920948:web:6a16664190f63933c7aa61",
  measurementId: "G-KFVR03HSSF"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export async function postContact(s) {
    const auth = getAuth(app);
    const userCredential = await signInAnonymously(auth);

    const userId = userCredential.user.uid;
    const database = getDatabase(app);
    const contactsRef = ref(database, 'contacts');
    const newContactRef = push(contactsRef);
    await set(newContactRef, {
        value: s,
        author: userId
    });
}

export async function shareTemplate(doc) {
  const auth = getAuth(app);
  const userCredential = await signInAnonymously(auth);

  const userId = userCredential.user.uid;
  const database = getDatabase(app);
  const sharesRef = ref(database, 'shares');
  const newShareRef = push(sharesRef);
  await set(newShareRef, {
      value: doc,
      author: userId
  });
  return newShareRef.key;
}

export async function loadTemplate(key) {
  const database = getDatabase(app);
  const docRef = ref(database, `shares/${key}`);
  const snapshot = await get(docRef);
  return snapshot.val();
}

export async function getLayover(key: string): Promise<Storyboard.Storyboard> {
  const auth = getAuth(app);
  await signInAnonymously(auth);

  const database = getDatabase(app);
  const docRef = ref(database, `layover/${key}/data`);
  const snapshot = await get(docRef);
  return snapshot.val();
}
