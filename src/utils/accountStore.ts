import { type Writable, writable } from "svelte/store";
import type { User } from "firebase/auth";

export type OnlineAccount = {
  feathral: number;
}

export const accountUser: Writable<User> = writable(null);
export const updateToken: Writable<boolean> = writable(false);
export const onlineAccount: Writable<OnlineAccount> = writable(null);
