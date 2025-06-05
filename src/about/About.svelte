<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { aboutOpen } from './aboutStore';
  import AboutContentJa from './AboutContentJa.svelte';
  import AboutContentEn from './AboutContentEn.svelte';
  import { locale } from 'svelte-i18n';
</script>


<div class="drawer-outer">
<Drawer open={$aboutOpen} placement="left" size="600px" on:clickAway={() => $aboutOpen = false}>
  <div class="drawer-content">
    {#if $locale === 'ja'}
      <AboutContentJa />
    {:else}
      <AboutContentEn />
    {/if}
  </div>
</Drawer>
</div>

<style>
  .drawer-content {
    width: 100%;
    height: 100%;
    font-family: 'Yu Gothic', sans-serif;
    font-weight: 500;
    text-align: left;
    padding: 16px;
    overflow-y: auto;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>