import type { Layer } from "../system/layeredCanvas";

export class FocusKeeper {
  subscribers: ((layer: Layer) => void)[] = [];

  constructor() {

  }

  subscribe(f: (layer: Layer) => void) {
    this.subscribers.push(f);
  }

  unsubscribe(f: (layer: Layer) => void) {
    this.subscribers = this.subscribers.filter((s) => s !== f);
  }

  setFocus(layer: Layer) {
    this.subscribers.forEach((s) => s(layer));
  }
}