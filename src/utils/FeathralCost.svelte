<script lang="ts">
  import feathralIcon from '../assets/feathral.png';
  export let showsLabel = true;
  export let cost: number;
</script>

<span class="flex flex-row">
  {#if showsLabel}
    <span class="caption">消費</span>
  {/if}
  <img src={feathralIcon} alt="feathral" width=20 height=20/>
  <span class="caption">x{cost}</span>
</span>

<style>
  .caption {
    font-family: '源暎アンチック';
    font-size: 16px;
  }
</style>
