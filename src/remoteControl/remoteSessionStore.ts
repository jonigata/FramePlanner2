import { writable } from 'svelte/store';

export type RemoteConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const remoteSessionId = writable<string | null>(null);
export const remoteConnectionStatus = writable<RemoteConnectionStatus>('disconnected');
