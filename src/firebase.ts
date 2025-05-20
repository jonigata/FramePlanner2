// Import the functions you need from the SDKs you need
import { type FirebaseApp, initializeApp } from "firebase/app";
import { analyticsEvent } from "./utils/analyticsEvent";
import { getAuth, signInAnonymously, type UserCredential, onAuthStateChanged, type User } from "firebase/auth";
import { getDatabase, ref, push, set, get } from "firebase/database";
import type { Storyboard } from "./utils/hiruma";
import firebase from 'firebase/compat/app';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { developmentFlag } from "./utils/developmentFlagStore";
import { get as storeGet } from "svelte/store";
import type { ProtocolChatLog, RichChatDocument } from "$bookTypes/richChat";
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
    apiKey: "AIzaSyCmyqkTy8C88UojorpPDsSB4os-OD3N2Ow",
    authDomain: "mangafarm-4a82e.firebaseapp.com",
    projectId: "mangafarm-4a82e",
    storageBucket: "mangafarm-4a82e.firebasestorage.app",
    messagingSenderId: "881545466298",
    appId: "1:881545466298:web:b18e30d54cbd456f504d83",
    measurementId: "G-3GPZQ4DTB4"
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
  analyticsEvent('feathral_generate');
  return r;
}

export async function generateImageFromTextWithFlux(data: any): Promise<any> {
  const r = await callFunc('generateimagefromtextflux', data, 180);
  analyticsEvent('flux_generate');
  return r;
}

export async function aiChat(log: ProtocolChatLog[], documents: RichChatDocument[]): Promise<any> {
  const r = await callFunc('chat', {log, documents}, 180);
  analyticsEvent('chat');
  return r;
}

export async function advise(data: any): Promise<{feathral: number, result: any}> {
  const r = await callFunc('advise', data, 180);
  analyticsEvent('advise');
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

export async function getTransportUrl(filename: string): Promise<{apiUrl: string, url: string, token: string, filename: string}> {
  const r = await callFunc('gettransporturl', {filename}, 180);
  console.log(r);
  return r;
}

export interface UserProfile {
  username: string;
  display_name: string;
  email: string;
  bio: string;
  related_url: string;
  is_admin: boolean; //updateMyProfileでは見てない
};

export async function getProfile(username: string | null): Promise<UserProfile | null> {
  const r = await callFunc('getprofile', {username}, 180);
  return r.userProfile;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const r = await callFunc('checkusernameavailable', {username}, 180);
  return r.available;
}

export async function updateMyProfile(profile: Omit<UserProfile,'is_admin'>): Promise<void> {
  await callFunc('updatemyprofile', {profile}, 180);
}

export interface PublicationContent {
  id: string;
  title: string;
  is_public: boolean;
  is_suspended: boolean;
  description: string;
  cover_url: string;
  content_url: string;
  thumbnail_url: string;
  created_at: string;
  updated_at: string;
  author_display_name: string;
  fav_count: number;
  comment_count: number;
  is_faved: boolean;
  is_favable: boolean;
  socialcard_url: string | null;
  related_url: string;
}

export type WritePublicationContent = Pick<
  PublicationContent, 
  'title' | 'description' | 'related_url' | 'content_url' | 'cover_url' | 'thumbnail_url' | 'socialcard_url' | 'is_public'>;

export async function recordPublication(publication: WritePublicationContent): Promise<string> {
  const r = await callFunc('recordpublication', {publication}, 180);
  return r.id;
}

export async function updatePublication(id: string, title: string, description: string, related_url: string | null, is_public: boolean): Promise<string> {
  const r = await callFunc('updatepublication', {publication: {id,title,description,is_public,related_url}}, 180);
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

export interface Works {
  isMine: boolean;
  works: PublicationContent[];
}
export async function getWorks(username: string | null): Promise<Works> {
  // author_idがnullの場合は自分の作品を取得
  const r = await callFunc('getworks', {username}, 180);
  console.log(r);
  return r as Works;
}

export async function getFav(work_id: string): Promise<number> {
  const r = await callFunc('getfav', {work_id}, 180);
  return r.fav;
}

export async function setFav(work_id: string, fav: boolean): Promise<void> {
  await callFunc('setfav', {work_id, fav}, 180);
}

export async function comment(work_id: string, content: string): Promise<void> {
  await callFunc('comment', {work_id, content}, 180);
}

export async function adminSuspend(work_id: string, is_suspended: boolean): Promise<void> {
  await callFunc('adminsuspend', {work_id, is_suspended}, 180);
}

export interface Mail {
  id: string;
  created_at: string;
  sender_display_name: string;
  title: string;
  content: string;
  read_at: string | null;
}

export async function getMails(): Promise<Mail[]> {
  const r = await callFunc('getmails', {}, 180);
  return r.mails;
}

export async function adminSendMail(username: string, title: string, content: string): Promise<void> {
  await callFunc('adminsendmail', {username, title, content}, 180);
}

export interface Comment {
  id: string;
  user_display_name: string;
  content: string;
  created_at: string;
}

export async function getComments(work_id: string): Promise<Comment[]> {
  const r = await callFunc('getcomments', {work_id}, 180);
  console.log(r);
  return r.comments;
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
