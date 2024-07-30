import { writable, type Writable } from 'svelte/store';

/**
 * PubSubQueue<T> - Pub-Subキュー実装
 * 
 * 特徴:
 * - 同期・非同期をサポート
 * - subscriberはasync関数
 * - Svelteのwritableストアを使用してキューの状態を追跡
 * - publishとpublishUniqueは非同期関数だが、awaitしなくても安全に動作する
 */
export type Subscriber<T> = (message: T) => Promise<void>;

export class PubSubQueue<T> {
  private subscribers: Set<Subscriber<T>> = new Set();
  private queue: T[] = [];
  private processingPromise: Promise<void> | null = null;
  private store: Writable<{ queueSize: number; subscriberCount: number }>;

  constructor() {
    this.store = writable({ queueSize: 0, subscriberCount: 0 });
  }

  async publish(message: T): Promise<void> {
    this.queue.push(message);
    this.updateStore();
    await this.ensureProcessing();
  }

  async publishUnique(message: T, isEqual: (a: T, b: T) => boolean): Promise<boolean> {
    const isAlreadyQueued = this.queue.some(queuedMessage => isEqual(queuedMessage, message));
    
    if (isAlreadyQueued) {
      return false;
    }

    await this.publish(message);
    return true;
  }

  subscribe(subscriber: Subscriber<T>): () => void {
    this.subscribers.add(subscriber);
    this.updateStore();
    return () => {
      this.subscribers.delete(subscriber);
      this.updateStore();
    };
  }

  private async ensureProcessing(): Promise<void> {
    if (!this.processingPromise) {
      this.processingPromise = this.processQueue();
    }
    return this.processingPromise;
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const message = this.queue.shift()!;
      await this.notifySubscribers(message);
      this.updateStore();
    }
    this.processingPromise = null;
  }

  private async notifySubscribers(message: T): Promise<void> {
    const promises = Array.from(this.subscribers).map(subscriber =>
      subscriber(message).catch(error => console.error('Subscriber error:', error))
    );
    await Promise.all(promises);
  }

  private updateStore(): void {
    this.store.set({
      queueSize: this.queue.length,
      subscriberCount: this.subscribers.size
    });
  }

  getStore(): Writable<{ queueSize: number; subscriberCount: number }> {
    return this.store;
  }
}

export const createPubSubQueue = <T>() => new PubSubQueue<T>();