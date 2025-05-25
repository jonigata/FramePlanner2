<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';

  let message: string = '';
  let positiveButtonText: string = 'はい';
  let negativeButtonText: string = 'いいえ';
  let title: string = '確認';

  onMount(() => {
    const args = $modalStore[0]?.meta;
    console.log('ConfirmDialog mounted, modal store:', args);

    if (args) {
      message = args.message || '';
      positiveButtonText = args.positiveButtonText || 'はい';
      negativeButtonText = args.negativeButtonText || 'いいえ';
      title = args.title || '確認';
    }
  });

  function onPositive() {
    $modalStore[0].response?.(true);
    modalStore.close();
  }

  function onNegative() {
    $modalStore[0].response?.(false);
    modalStore.close();
  }
</script>

<div class="card p-4 shadow-xl">
  <header class="card-header">
    <h2>{title}</h2>
  </header>
  <section class="p-4">
    <p class="message-text">{message}</p>
  </section>
  <footer class="card-footer flex gap-2">
    <div class="flex-1"></div>
    <button class="btn variant-ghost-surface" on:click={onNegative}>
      {negativeButtonText}
    </button>
    <button class="btn variant-filled-primary" on:click={onPositive}>
      {positiveButtonText}
    </button>
  </footer>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    margin-top: 16px;
  }
  
  .message-text {
    font-size: 16px;
    line-height: 1.6;
    color: var(--color-surface-900);
    white-space: pre-wrap;
  }
</style>