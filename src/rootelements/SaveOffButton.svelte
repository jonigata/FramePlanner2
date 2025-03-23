<script type="ts">
  import { toolTip } from '../utils/passiveToolTipStore';
  import { saveProhibitFlag } from '../utils/developmentFlagStore';
  import { onMount } from 'svelte';
  import barricadeIcon from '../assets/barricade.webp';
  
  function toggle() {
    $saveProhibitFlag = !$saveProhibitFlag;
    sessionStorage.setItem('saveProhibited', $saveProhibitFlag.toString());
  }

  onMount(() => {
    $saveProhibitFlag = sessionStorage.getItem('saveProhibited') === 'true';
  });
</script>

{#if $saveProhibitFlag}
  <button class="variant-ghost-error text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 open-button hbox" on:click={toggle}
    use:toolTip={`現在セーブ禁止`}>
    <img src={barricadeIcon} alt="セーブオフ"/>
  </button>
{:else}
  <button class="variant-ghost-surface text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 open-button hbox" on:click={toggle}
    use:toolTip={`現在セーブ許可`}>
    <img src={barricadeIcon} alt="セーブオフ"/>
  </button>
{/if}

<style>
  .open-button {
    pointer-events: auto;
    position: absolute;
    width: 80px;
    height: 80px;
    bottom: 20px;
    left: 160px;
  }
  img {
    width: 80%;
    height: 80%;
  }
</style>
