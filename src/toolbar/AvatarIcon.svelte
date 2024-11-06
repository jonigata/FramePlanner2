<script lang="ts">
  export let src: string | null = null;
  export let size = "w-6 h-6";
  export let alt = "User avatar";
  export let username = "？";

  // ユーザー名から最初の2文字を取得
  $: initials = username
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // ユーザー名からハッシュ値を生成して色を決定
  $: backgroundColor = `hsl(${username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360}, 70%, 60%)`;
</script>

<div class="avatar" on:click>
  {#if src}
    <img {src} {alt} class="{size} rounded-full" />
  {:else}
    <div 
      class="{size} rounded-full flex items-center justify-center text-white text-sm font-medium"
      style="background-color: {backgroundColor}"
    >
      {initials}
    </div>
  {/if}
</div>

<style>
  .avatar {
    display: flex;
    align-items: center;
  }
</style>