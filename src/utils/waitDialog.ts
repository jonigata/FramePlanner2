  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';

export async function waitDialog<T>(dialogComponent: string, meta: any = {}): Promise<T> {
  const r = await new Promise<T>((resolve) => {
    const d: ModalSettings = {
      type: 'component',
      component: dialogComponent,
      meta,
      response: resolve,
    };
    modalStore.trigger(d);
  });
  // 直ちに次のモーダルを開くと自動的に閉じてしまうようなので(多分svelte skeletonのアニメーション処理のバグ)
  await new Promise(resolve => setTimeout(resolve, 500));
  return r;
}
