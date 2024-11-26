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

export async function outPaint(dataUrl: string, size: {width: number, height: number}, padding: {left:number,right:number,top:number,bottom:number}): Promise<any> {
  const r = await callFunc('outpaint', {dataUrl,size,padding}, 180);
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

export interface UserProfile {
  username: string;
  display_name: string;
  email: string;
  bio: string;
};

export async function getMyProfile(): Promise<UserProfile | null> {
  const r = await callFunc('getmyprofile', {}, 180);
  return r.userProfile;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const r = await callFunc('checkusernameavailable', {username}, 180);
  return r.available;
}

export async function updateMyProfile(profile: UserProfile): Promise<void> {
  await callFunc('updatemyprofile', {profile}, 180);
}

export interface PublicationContent {
  id: string;
  title: string;
  is_public: boolean;
  description: string;
  cover_url: string;
  content_url: string;
  thumbnail_url: string;
  created_at: string;
  updated_at: string;
  author_display_name: string;
  fav_count: number;
}

export type WritePublicationContent = Pick<
  PublicationContent, 
  'title' | 'description' | 'content_url' | 'cover_url' | 'thumbnail_url'>;

export async function recordPublication(publication: WritePublicationContent): Promise<string> {
  const r = await callFunc('recordpublication', {publication}, 180);
  return r.id;
}

export async function updatePublication(id: string, title: string, description: string, is_public: boolean): Promise<string> {
  const r = await callFunc('updatepublication', {publication: {id,title,description,is_public}}, 180);
  return r.id;
}

export async function getPublication(id: string): Promise<PublicationContent> {
  const r = await callFunc('getpublication', {id}, 180);
  return r.publication;
}

export async function getNewReleases(): Promise<PublicationContent[]> {
  const r = await callFunc('getnewreleases', {}, 180);
  return r.newReleases;
}

export async function getWorks(author_id: string | null): Promise<PublicationContent[]> {
  // author_idがnullの場合は自分の作品を取得
  const r = await callFunc('getworks', {author_id}, 180);
  console.log(r);
  return r.works;
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
