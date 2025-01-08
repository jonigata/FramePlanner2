import { type Writable } from 'svelte/store';

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
