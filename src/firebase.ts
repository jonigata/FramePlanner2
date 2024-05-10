// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, ref, push, set, get } from "firebase/database";
import type * as Storyboard from "./weaver/storyboard";
import firebase from 'firebase/compat/app';
import * as firebaseui from 'firebaseui'
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { developmentFlag } from "./utils/developmentFlagStore";
import { get as storeGet } from "svelte/store";
import type { ProtocolChatLog, RichChatDocument } from "./utils/richChat";

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

function useEmulatorIfDevelopment() {
  if (storeGet(developmentFlag)) {
    const functions = getFunctions(app);
    connectFunctionsEmulator(functions, "localhost", 5001);
  }
}

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
      firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      firebase.auth.EmailAuthProvider.PROVIDER_ID,
    ],
    tosUrl: './termsOfService.html',
    privacyPolicyUrl: './privacy.html',
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
  useEmulatorIfDevelopment();
  const updateFeathral = httpsCallable(functions, 'updatefeathralifneeded');
  const r = await updateFeathral();
  console.tag("feathral", "cyan", r);
  return (r.data as any).feathral;
}

async function callFunc(name: string, data: any, timeout: number | null): Promise<any> {
  if (timeout == null) {
    const functions = getFunctions(app);
    useEmulatorIfDevelopment();
    const f = httpsCallable(functions, name);
    const r = await f(data);
    console.log(r);
    return r.data;
  } else {
    const functions = getFunctions(app);
    useEmulatorIfDevelopment();
    const f = httpsCallable(functions, name);

    // タイムアウトを検出するプロミス
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("タイムアウト\n2分後に再度試行してください."));
      }, timeout);
    });

    const r: any = await Promise.race([f(data), timeoutPromise]);
    return r.data;
  }
}

export async function generateImageFromTextWithFeathral(data: any): Promise<any> {
  const r = await callFunc('generateimagefromtext', data, null);
  logEvent(analytics, 'feathral_generate');
  return r;
}

export async function aiChat(log: ProtocolChatLog[], documents: RichChatDocument[]): Promise<any> {
  const r = await callFunc('chat', {log, documents}, null);
  logEvent(analytics, 'chat');
  return r;
}
