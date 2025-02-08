import type { Layer } from "../system/layeredCanvas";

export class FocusKeeper {
  subscribers: ((layer: Layer | null) => void)[] = [];

  constructor() {}

  subscribe(f: (layer: Layer | null) => void) {
    this.subscribers.push(f);
  }

  unsubscribe(f: (layer: Layer | null) => void) {
    this.subscribers = this.subscribers.filter((s) => s !== f);
  }

  setFocus(layer: Layer | null) {
    this.subscribers.forEach((s) => s(layer));
  }
}