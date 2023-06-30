import { Node, File, Folder } from './fileSystem';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, push, set, get, child, remove, type DatabaseReference } from "firebase/database";

// 仮
import { app } from '../../firebase';

let uid: string = null;

export class FirebaseFile extends File {
  fbnode: DatabaseReference;

  constructor(fbnode: DatabaseReference) {
    super(fbnode.key);
  }

  async read(): Promise<string> {
    const snapshot = await get(this.fbnode);
    return snapshot.val();
  }

  async write(data: string): Promise<void> {
    await set(this.fbnode, data);
  }
}

export class FirebaseFolder extends Folder {
  fbnode: DatabaseReference;

  child(name: string): DatabaseReference {
    return child(this.fbnode, name);
  }

  constructor(fbnode: DatabaseReference) {
    super(fbnode.key);
    this.fbnode = fbnode;
  }

  async list(): Promise<Node[]> {
    const snapshot = await get(this.fbnode);
    const list = [];
    snapshot.forEach((c) => {
      list.push(new FirebaseFile(this.child(c.key)));
    });
    return list;
  }

  async createFile(name: string): Promise<File> {
    return new FirebaseFile(this.child(name));
  }

  async deleteFile(name: string): Promise<void> {
    await remove(child(this.fbnode, name));
  }
}

export async function signUp(email: string, password: string): Promise<string> {
  const auth = getAuth();
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user.uid;
}

export async function signIn(email: string, password: string): Promise<string> {
  const auth = getAuth();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user.uid;
}

export function getFileSystemRoot(): Folder {
  const database = getDatabase(app);
  const rootRef = ref(database, `users/${uid}/files`);
  return new FirebaseFolder(rootRef);
}