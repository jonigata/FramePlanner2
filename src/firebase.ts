// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, ref, push, set } from "firebase/database";

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
const app = initializeApp(firebaseConfig);
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
    })
}
