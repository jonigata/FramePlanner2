<script lang="ts">
  export let size = "w-6 h-6";
  export let username: string | null;
  export let avatarUrl: string | null

  let initials = '?';

  $: console.log("avatarUrl", avatarUrl);

  // ユーザー名からイニシャルを取得
  $: if (username) {
    initials = username
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  // ユーザー名のハッシュ値で色を決定
  $: backgroundColor = `hsl(${[...(username ?? '')].reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360}, 70%, 60%)`;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="avatar {size} rounded-full flex items-center justify-center" style="background-color: {backgroundColor};" on:click>
  {#if avatarUrl}
    <img src={avatarUrl} alt={"user avatar"} class="rounded-full object-cover w-full h-full shadow-md group-hover:shadow-xl transition-shadow" />
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
