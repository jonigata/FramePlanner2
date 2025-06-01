import { type Writable, writable } from 'svelte/store';

export function waitForChange<T>(store: Writable<T>, condition: (value: T) => boolean): Promise<T> {
  return new Promise((resolve) => {
    const unsubscribe = store.subscribe(value => {
      if (condition(value)) {
        unsubscribe();
        resolve(value);
      }
    });
  });
}

export function createGate() {
  const store = writable(false);

  return {
    wait: () => {
      store.set(false);
      return waitForChange(store, value => value);
    },
    signal: () => store.set(true),
    reset: () => store.set(false)
  };
}
