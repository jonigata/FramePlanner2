<script>
  import Parameter from '../utils/Parameter.svelte';
  import FreehandInspectorEasing from './FreehandInspectorEasing.svelte';

  export let taper = {
    cap: true,
    taper: 0,
    easing: "linear",
  };
</script>

<div class="parameter-box">
  <Parameter label="開始点の鋭さ" bind:value={taper.taper} min={0} max={100} step={1}/>
</div>
<div class="parameter-box">
  {#if taper.taper == 0}
    <label class="flex items-center space-x-2">丸める
      <input class="checkbox" type="checkbox" bind:checked={taper.cap} />
    </label>
  {:else}
    <div class="parameter-box">
      <FreehandInspectorEasing bind:value={taper.easing}/>
    </div>
  {/if}
</div>

<style>
  .parameter-box {
    display: flex;
    gap: 8px;
    align-items: center;
  }
</style>
