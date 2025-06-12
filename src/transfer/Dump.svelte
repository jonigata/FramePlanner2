<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';

  let filesize: string | null = null;
  let sourceTitle: string = '';  

  function handleSubmit() {
    $modalStore[0].response!(true);
    modalStore.close();
  }

  function handleCancel() {
    modalStore.close();
  }

  onMount(() => {
    const args = $modalStore[0]?.meta;
    console.log('Dialog mounted, modal store:', args);
    sourceTitle = args.sourceTitle;
  });
</script>

<div class="card p-4 w-full max-w-lg">
  <div class="px-4">
    <h3>{$_('dump.title')}</h3>
    <div class="p-2">
      <p>{@html $_('dump.description').replace(/\\n/g, '<br>')}</p>
      <p class="mt-2">{$_('dump.warning')}</p>
      <!-- <p class="mt-2">推定ファイルサイズ： <b>{filesize ?? '計算中'}</b></p> -->
    </div>
  </div>

  <div class="flex justify-end gap-2 mt-4">
    <button type="button" class="btn variant-ghost" on:click={handleCancel}>
      {$_('dump.cancel')}
    </button>
    <button 
      type="button" 
      class="btn variant-filled-primary"
      on:click={handleSubmit}
    >
      {$_('dump.startDump')}
    </button>
  </div>
</div>

<style>
  h3 {
    font-family: '源暎エムゴ';
    font-size: 20px;
    display: flex;
    gap: 8px;
  }
</style>
