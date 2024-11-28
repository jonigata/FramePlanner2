<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onlineProfile } from '../utils/accountStore';

  export let title = '';
  export let description = '';
  export let related_url = '';

  $: beforeRegistration = $onlineProfile == null;

  function handleSubmit() {
    $modalStore[0].response!({ result: "ok", title, description, related_url });
    modalStore.close();
  }

  function handleCancel() {
    modalStore.close();
  }

  function goToRegistration() {
    $modalStore[0].response!({ result: "registerUser" });
    modalStore.close();
  }
</script>

<div class="card p-4 w-full max-w-lg">
  {#if beforeRegistration}
    <p class="text-sm text-gray-500 mb-4">
      まんがファームへ作品を投稿するには、ユーザー登録が必要です。
    </p>
    <button 
      class="btn variant-filled-primary"
      on:click={goToRegistration}
    >
      ユーザー登録へ
    </button>
{:else}
  <h2 class="h2 mb-4">ドキュメントの公開</h2>
  <form on:submit|preventDefault={handleSubmit}>
    <label class="label">
      <span>タイトル*</span>
      <input
        class="input p-2 pl-4 w-full"
        type="text"
        bind:value={title}
        required
        maxlength="100"
      />
    </label>

    <label class="label">
      <span>説明</span>
      <textarea
        class="textarea p-2 pl-4 w-full"
        bind:value={description}
        maxlength="500"
        rows="4"
      />
    </label>

    <label class="label">
      <span>関連URL</span>
      <input
        class="input p-2 pl-4 w-full"
        type="text"
        bind:value={related_url}
        required
        maxlength="100"
      />
    </label>

    <span>※ページ1が表紙になります</span>

    <div class="flex justify-end gap-2 mt-4">
      <button type="button" class="btn variant-ghost" on:click={handleCancel}>
        キャンセル
      </button>
      <button 
        type="submit" 
        class="btn variant-filled-primary"
        disabled={!title}
      >
        公開
      </button>
    </div>
  </form>
  {/if}
</div>

<style>
  .label {
    display: block;
    margin-bottom: 1rem;
  }

  .label span {
    display: block;
    margin-bottom: 0.25rem;
  }
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .border {
    border: 1px solid #ccc;
  }
</style>