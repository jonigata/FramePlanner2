// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, ref, push, set, get } from "firebase/database";
import type * as Storyboard from "./weaver/storyboard";
import firebase from 'firebase/compat/app';
import * as firebaseui from 'firebaseui'
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";

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

let ui = null;
let uiConfig = null;

export function prepareAuth() {
  uiConfig = {
    signInSuccessUrl: './',
    signInOptions: [
      // Leave the lines as is for the providers you want to offer your users.
      firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      firebase.auth.EmailAuthProvider.PROVIDER_ID,
    ],
    // tosUrl and privacyPolicyUrl accept either url string or a callback
    // function.
    // Terms of service url/callback.
    tosUrl: 'www.example.com', // TODO:
    // Privacy policy url/callback.
    privacyPolicyUrl: function() {
      window.location.assign('www.example.com'); // TODO:
    },
  };

  // Initialize the FirebaseUI Widget using Firebase.
  if (ui) {
    ui.reset();
  } else {
    const auth = getAuth(app);
    ui = new firebaseui.auth.AuthUI(auth);
  }
}

export function isPendingRedirect() {
  return ui.isPendingRedirect();
}

export function startAuth(elementId: string) {
  // The start method will wait until the DOM is loaded.
  ui.start(elementId, uiConfig);  
}

export async function updateFeathral(): Promise<number> {
  const functions = getFunctions(app);
  const updateFeathral = httpsCallable(functions, 'updateFeathralIfNeeded');
  const r = await updateFeathral();
  console.tag("feathral", "cyan", r.data);
  return (r.data as any).feathral;
}

export async function generateImageFromTextWithFeathral(data: any): Promise<HTMLImageElement> {
  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, "localhost", 5001);
  const generateImageFromTextWithFeathral = httpsCallable(functions, 'generateImageFromText');
  const r = await generateImageFromTextWithFeathral(data);

  const img = document.createElement('img');
  img.src = "data:image/png;base64," + (r.data as any).image;

  return img;
}