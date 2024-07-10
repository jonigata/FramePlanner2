import { writable, derived, get } from "svelte/store";

type AsyncStoreActions<T> = {
  subscribe: (run: (value: AsyncStoreState<T>) => void) => () => void;
  trigger: () => Promise<T>;
  resolve: (value: T) => void;
  isActive: {subscribe: (run: (value: boolean) => void) => () => void };
};

type AsyncStoreState<T> = {
  isActive: boolean;
  resolve: ((value: T) => void) | null;
};

export function createAsyncStore<T>(): AsyncStoreActions<T> {
  const store = writable<AsyncStoreState<T>>({ isActive: false, resolve: null });

  const isActive = derived(store, $store => $store.isActive);

  function trigger(): Promise<T> {
    return new Promise((resolve) => {
      store.set({ isActive: true, resolve });
    });
  }

  function resolve(value: T) {
    const currentState = get(store);
    if (currentState.resolve) {
      currentState.resolve(value);
      store.set({ isActive: false, resolve: null });  // 自動的にisActiveをfalseに設定
    }
  }

  return {
    subscribe: store.subscribe,
    trigger,
    resolve,
    isActive
  };
}
