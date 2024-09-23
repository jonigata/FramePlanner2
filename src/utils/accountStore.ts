import { type Writable, writable, get } from "svelte/store";
import { type User } from "firebase/auth";
import { modalStore } from '@skeletonlabs/skeleton';
import { isPendingRedirect, prepareAuth, getAuth, getFeathral } from '../firebase';

export type OnlineAccount = {
  user: User | null;
  feathral: number;
}

export type OnlineStatus = "unknown" | "signed-in" | "signed-out";

export const updateToken: Writable<boolean> = writable(false);
export const onlineStatus: Writable<OnlineStatus> = writable("unknown");
export const onlineAccount: Writable<OnlineAccount | null> = writable(null);

export function isAuthStateUnknown(): boolean {
  return get(onlineAccount) === null;
}

export function isSignedIn(): boolean {
  const account = get(onlineAccount);
  return account !== null && account.user !== null;
}

export function isSignedOut(): boolean {
  const account = get(onlineAccount);
  return account !== null && account.user === null;
}

export function signIn() {
  modalStore.trigger({ type: 'component', component: 'signIn' });
}

export function signOut() {
  const auth = getAuth();
  auth.signOut().then(() => { ;
    // reload
    location.reload();
  });
}

export function bootstrap() {
  prepareAuth();
  if (isPendingRedirect()) {
    console.log("isPendingRedirect");
    modalStore.trigger({ type: 'component', component: 'signIn' });
  }

  const auth = getAuth();
  auth.onAuthStateChanged(async (user) => {
    console.log("onAuthStateChanged", user);
    if (user) {
      const feathral = await getFeathral();
      onlineAccount.set({ user, feathral });
      onlineStatus.set("signed-in");
      console.log("signed-in");
    } else {
      onlineAccount.set({ user: null, feathral: 0 });
      onlineStatus.set("signed-out");
      console.log("signed-out");
    }
  });

  updateToken.subscribe(async (value) => {
    if (!value) { return; }
    if (isAuthStateUnknown()) { return; } 
    if (isSignedOut()) { return; }
    const n = await getFeathral();
    onlineAccount.set({ user: get(onlineAccount).user, feathral: n });
    updateToken.set(false);
  });
}