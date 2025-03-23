<script lang="ts">
  import sprytIcon from '../assets/spryt.webp';

  // 通貨単位はfeathral => sprytに変更
  // 内部データは変更困難なので、表示のみ変更

  export let showsLabel = true;
  export let cost: number;
</script>

<span class="flex flex-row">
  {#if showsLabel}
    <span class="caption">消費</span>
  {/if}
  <img src={sprytIcon} alt="spryt" width=20 height=20/>
  <span class="caption">x{cost}</span>
</span>

<style>
  .caption {
    font-family: '源暎アンチック';
    font-size: 16px;
  }
</style>
