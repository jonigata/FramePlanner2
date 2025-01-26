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
  return r;
}
