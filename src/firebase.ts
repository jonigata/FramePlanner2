// Import the functions you need from the SDKs you need
import { type FirebaseApp, initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getAuth, signInAnonymously, type UserCredential, onAuthStateChanged, type User } from "firebase/auth";
import { getDatabase, ref, push, set, get } from "firebase/database";
import type { Storyboard } from "./utils/hiruma";
import firebase from 'firebase/compat/app';
import * as firebaseui from 'firebaseui'
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { developmentFlag } from "./utils/developmentFlagStore";
import { get as storeGet } from "svelte/store";
import type { ProtocolChatLog, RichChatDocument } from "./lib/book/richChat";
import { getStorage } from "firebase/storage";

function useEmulatorIfDevelopment() {
  if (storeGet(developmentFlag)) {
    const functions = getFunctions(app);
    connectFunctionsEmulator(functions, "localhost", 5001);
  }
}

// Initialize Firebase
let app: FirebaseApp;

export function initializeApp2(authDomain: string) {
  console.log("authDomain", authDomain);
  const firebaseConfig = {
    apiKey: "AIzaSyCPPVAnF20YkqizR5XbgprhM_lGka-FcmM",
    authDomain: authDomain,
    databaseURL: "https://frameplanner-e5569-default-rtdb.firebaseio.com",
    projectId: "frameplanner-e5569",
    storageBucket: "frameplanner-e5569.appspot.com",
    messagingSenderId: "415667920948",
    appId: "1:415667920948:web:6a16664190f63933c7aa61",
    measurementId: "G-KFVR03HSSF"
  };
  app = initializeApp(firebaseConfig);
}

export async function getCurrentUserOrSignInAnonymously(): Promise<UserCredential> {
  const auth = getAuth(app);
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      unsubscribe(); // リスナーを解除
      try {
        if (user) {
          // 既存のユーザーが見つかった場合
          resolve({
            user: user,
            providerId: user.providerId,
            operationType: "signIn"
          } as UserCredential);
        } else {
          // ユーザーが見つからない場合、匿名サインインを実行
          const userCredential = await signInAnonymously(auth);
          resolve(userCredential);
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}

export async function postContact(s: string) {
    const userCredential = await getCurrentUserOrSignInAnonymously();

    const userId = userCredential.user.uid;
    const database = getDatabase(app);
    const contactsRef = ref(database, 'contacts');
    const newContactRef = push(contactsRef);
    await set(newContactRef, {
        value: s,
        author: userId
    });
}

export async function getLayover(key: string): Promise<Storyboard> {
  const userCredential = await getCurrentUserOrSignInAnonymously();

  const database = getDatabase(app);
  const docRef = ref(database, `layover/${key}/data`);
  const snapshot = await get(docRef);
  return snapshot.val();
}

let ui: firebaseui.auth.AuthUI | null = null;
let uiConfig: firebaseui.auth.Config | null = null;

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
  return ui!.isPendingRedirect();
}

export function startAuth(elementId: string) {
  // The start method will wait until the DOM is loaded.
  ui!.start(elementId, uiConfig!);  
}

export async function getFeathral(): Promise<number> {
  const functions = getFunctions(app);
  useEmulatorIfDevelopment();
  const updateFeathral = httpsCallable(functions, 'updatefeathralifneeded');
  const r = await updateFeathral();
  console.tag("feathral", "cyan", r);
  return (r.data as any).feathral;
}

async function callFunc(name: string, data: any, timeout: number | null): Promise<any> {
  const functions = getFunctions(app);
  useEmulatorIfDevelopment();
  const f = httpsCallable(functions, name, timeout == null ? undefined: {timeout: timeout * 1000});
  const r = await f(data);
  console.log(r);
  return r.data;
}

export async function generateImageFromTextWithFeathral(data: any): Promise<any> {
  const r = await callFunc('generateimagefromtext', data, 180);
  logEvent(getAnalytics(), 'feathral_generate');
  return r;
}

export async function generateImageFromTextWithFlux(data: any): Promise<any> {
  const r = await callFunc('generateimagefromtextflux', data, 180);
  logEvent(getAnalytics(), 'flux_generate');
  return r;
}

export async function aiChat(log: ProtocolChatLog[], documents: RichChatDocument[]): Promise<any> {
  const r = await callFunc('chat', {log, documents}, 180);
  logEvent(getAnalytics(), 'chat');
  return r;
}

export async function advise(data: any): Promise<{feathral: number, result: any}> {
  const r = await callFunc('advise', data, 180);
  logEvent(getAnalytics(), 'advise');
  return r;
}

export async function listSharedImages(): Promise<any> {
  const r = await callFunc('cleansharedimages', {}, 180);
  return r;
}

export async function transformText(method: string, text: string): Promise<any> {
  const r = await callFunc('transformtext', {method, text}, 180);
  return r;
}

export async function removeBg(dataUrl: string): Promise<any> {
  const r = await callFunc('removebg', {dataUrl}, 180);
  return r;
}

export async function notifyShare(url: string): Promise<any> {
  const r = await callFunc('notifyshare', {url}, 180);
  return r;
}

export async function getUploadUrl(filename: string): Promise<{url: string, token: string, filename: string}> {
  const r = await callFunc('getuploadurl', {filename}, 180);
  console.log(r);
  return r;
}

export async function getDownloadUrl(filename: string): Promise<{url: string}> {
  const r = await callFunc('getdownloadurl', {filename}, 180);
  console.log(r);
  return r;
}

export async function eraseFile(filename: string): Promise<any> {
  const r = await callFunc('erasefile', {filename}, 180);
  return r;
}

export async function getPublishUrl(filename: string): Promise<{apiUrl: string, url: string, token: string, filename: string}> {
  const r = await callFunc('getpublishurl', {filename}, 180);
  console.log(r);
  return r;
}

function getAuth2() {
  return getAuth(app);
}

function getDatabase2() {
  return getDatabase(app);
}

export function getShareStorage() {
  return getStorage(app);
}

export function getCloudStorage() {
  return getStorage(app, "gs://frameplanner-e5569-m24tg");
}

export { getAuth2 as getAuth, getDatabase2 as getDatabase, initializeApp2 as initializeApp };
