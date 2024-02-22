import { type Writable, writable } from "svelte/store";
import type { User } from "firebase/auth";

export type OnlineAccount = {
  feathral: number;
}

export const accountUser: Writable<User> = writable(null);
export const onlineAccount: Writable<OnlineAccount> = writable(null);
