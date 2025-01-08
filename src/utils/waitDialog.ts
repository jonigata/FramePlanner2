  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';

export async function waitDialog<T>(dialogComponent: string): Promise<T> {
  const r = await new Promise<T>((resolve) => {
    const d: ModalSettings = {
      type: 'component',
      component: dialogComponent,
      response: resolve,
    };
    modalStore.trigger(d);
  });
  return r;
}
