<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';

  // 3シーン分の状態
  let step = 0;

  function handleNext() {
    if (step < 2) step += 1;
    else {
      // 完了時
      $modalStore[0]?.response?.(true);
      modalStore.close();
    }
  }

  function handleBack() {
    if (step > 0) step -= 1;
  }

  function handleCancel() {
    $modalStore[0]?.response?.(false);
    modalStore.close();
  }
</script>

<div class="card p-4 w-full max-w-lg">
  <h2 class="h2">ウィザードダイアログ</h2>

  <div class="variant-ghost-primary p-1 pt-2 m-2 mb-4 rounded">
    <div class="px-4">
      {#if step === 0}
        <h3>シーン1: はじめに</h3>
        <div class="p-2">
          <p>ウィザードの最初のステップです。ここに説明や入力欄を配置できます。</p>
        </div>
      {:else if step === 1}
        <h3>シーン2: 詳細設定</h3>
        <div class="p-2">
          <p>2番目のステップです。追加の情報や設定をここで入力できます。</p>
        </div>
      {:else if step === 2}
        <h3>シーン3: 確認</h3>
        <div class="p-2">
          <p>最後のステップです。内容を確認し、「完了」を押してください。</p>
        </div>
      {/if}
    </div>
  </div>

  <div class="flex justify-between items-center mt-4 px-4">
    <button type="button" class="btn variant-ghost" on:click={handleCancel}>
      キャンセル
    </button>
    <div class="flex gap-2">
      <button type="button" class="btn variant-ghost" on:click={handleBack} disabled={step === 0}>
        戻る
      </button>
      <button type="button" class="btn variant-filled-primary" on:click={handleNext}>
        {step < 2 ? '次へ' : '完了'}
      </button>
    </div>
  </div>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    display: flex;
    gap: 8px;
  }
  h3 {
    font-family: '源暎エムゴ';
    font-size: 20px;
    display: flex;
    gap: 8px;
  }
  .card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .btn[disabled] {
    opacity: 0.5;
    pointer-events: none;
  }
</style>