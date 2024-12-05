<script lang="ts">
  import { DelayedCommiter } from '../utils/delayedCommiter';
  import { checkUsernameAvailable, updateProfile } from '../supabase'
  import { modalStore } from '@skeletonlabs/skeleton';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { loading } from '../utils/loadingStore';
  import { onlineProfile, type OnlineProfile } from '../utils/accountStore';
  
  export let username = '';
  export let display_name = '';
  export let email = '';
  export let bio = '';
  export let related_url = '';
  
  let isChecking = false;
  let isAvailable = false;
  let isDirty = false;

  let uniqueChecker = new DelayedCommiter(async () => {
    isChecking = true;
    try {
      isAvailable = (await checkUsernameAvailable(username)).is_available;
    } catch (error) {
      console.error('Username check failed:', error);
    } finally {
      isChecking = false;
      isDirty = false;
    }
  })

  async function handleSubmit() {
    if (isAvailable && isDisplayNameValid) {
      try {
        $loading = true;
        await updateProfile({ username, display_name, email, bio, related_url });
        $modalStore[0].response!(true);
        modalStore.close();
      } catch (error) {
        console.log(error);
        toastStore.trigger({ message: 'プロフィールの更新に失敗しました', timeout: 3000 });
      } finally {
        $loading = false;
      }
    }
  }

  function handleCancel() {
    modalStore.close();
  }

  function handleUsernameInput() {
    isAvailable = false;
    isDirty = true;
    uniqueChecker.schedule(1000);
  }

  $: if (username) {
    handleUsernameInput();
  }

  $: onOnlineProfileChanged($onlineProfile);
  function onOnlineProfileChanged(profile: OnlineProfile | null) {
    if (profile) {
      username = profile.username;
      display_name = profile.display_name;
      email = profile.email;
      bio = profile.bio;
      related_url = profile.related_url;
      isAvailable = true;
    }
  }

  // 表示名が有効かチェック
  $: isDisplayNameValid = display_name.length >= 1;

</script>

<div class="card p-4 w-full max-w-lg">
  <h2 class="h2 mb-4">プロフィール編集</h2>
  
  <form on:submit|preventDefault={handleSubmit}>
    <label class="label">
      <div class="flex items-center gap-2">
        <span>ユーザー名*</span>
      </div>
      <div class="relative">
        <input
          class="input p-2 pl-4 w-full"
          class:input-success={isAvailable}
          class:input-error={!isAvailable && !isDirty && username}
          type="text"
          bind:value={username}
          required
          minlength="3"
          maxlength="30"
        />
        {#if isChecking}
          <span class="text-sm text-gray-500">確認中...</span>
        {:else if !isDirty && username}
          {#if isAvailable}
            <span class="text-sm text-success-500">✓ 使用可能です</span>
          {:else}
            <span class="text-sm text-error-500">このユーザー名は既に使用されています</span>
          {/if}
        {/if}
      </div>
    </label>

    <label class="label">
      <span>表示名*</span>
      <input
        class="input p-2 pl-4 w-full"
        class:input-error={!isDisplayNameValid && display_name !== ''}
        type="text"
        bind:value={display_name}
        required
        maxlength="50"
      />
    </label>

    <label class="label">
      <span>メールアドレス（<a href="https://ja.gravatar.com/" target="_blank" rel="noopener noreferrer">gravatar</a>対応）</span>
      <input
        class="input p-2 pl-4"
        type="email"
        bind:value={email}
      />
    </label>

    <label class="label">
      <span>自己紹介</span>
      <textarea
        class="textarea p-2 pl-4"
        bind:value={bio}
        maxlength="500"
        rows="4"
      />
    </label>

    <label class="label">
      <span>関連URL</span>  
      <input
        class="input p-2 pl-4"
        type="text"
        bind:value={related_url}
      />
    </label>

    <div class="flex justify-end gap-2 mt-4">
      <button type="button" class="btn variant-ghost" on:click={handleCancel}>
        キャンセル
      </button>
      <button 
        type="submit" 
        class="btn variant-filled-primary"
        disabled={!isAvailable || isChecking || !username || !isDisplayNameValid}
      >
        保存
      </button>
    </div>
  </form>
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
</style>