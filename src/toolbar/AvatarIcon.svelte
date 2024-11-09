<script lang="ts">
  import md5 from 'md5'; // md5ハッシュ化のためのライブラリを使用
  import { onlineProfile } from '../utils/accountStore';

  export let email: string | null = null;
  export let src: string | null = null;
  export let size = "w-6 h-6";
  export let alt = "User avatar";
  export let username = "？";

  $: email = $onlineProfile?.email ?? email;

  // ユーザー名からイニシャルを取得
  $: initials = username
    .split(' ')
    .map(word => word.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // ユーザー名のハッシュ値で色を決定
  $: backgroundColor = `hsl(${[...username].reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360}, 70%, 60%)`;

  // Gravatar URLを生成（srcがない場合のみ使用）
  $: gravatarUrl = email ? `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}` : null;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="avatar {size} rounded-full flex items-center justify-center" style="background-color: {backgroundColor};" on:click>
  {#if src || gravatarUrl}
    <img src={src || gravatarUrl} {alt} class="rounded-full object-cover w-full h-full" />
  {:else}
    <span class="text-white text-sm font-medium">
      {initials}
    </span>
  {/if}
</div>

<style>
  .avatar {
    display: flex;
    align-items: center;
    cursor: pointer;
  }
</style>
