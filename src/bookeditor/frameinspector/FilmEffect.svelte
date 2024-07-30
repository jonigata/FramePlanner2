<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Effect } from "../../lib/layeredCanvas/dataModels/effect";
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import NumberEdit from '../../utils/NumberEdit.svelte';
	import ColorPickerLabel from '../../utils/colorpicker/ColorPickerLabel.svelte';
  import { onMount } from "svelte";

  import deleteIcon from '../../assets/filmlist/delete.png';

  const dispatch = createEventDispatcher();

  const parameterLists = {
    "OutlineEffect": [
      { name: "color", label: "色", type: "color" },
      { name: "width", label: "幅", type: "number", min: 0, max: 0.1, step: 0.001 },
      { name: "sharp", label: "シャープ", type: "number", min: 0, max: 1, step: 0.01 },
    ],
  }
  
  const titles = {
    "OutlineEffect": "アウトライン",
  }
  export let effect: Effect;

  function onDelete() {
    dispatch("delete", effect);
  }

  $: onEffectChanged(effect);
  function onEffectChanged(effect: Effect) {
    dispatch("update", effect);
  }

  // 以下スライダーのドラッグがsortable listで誤動作しないようにするためのhack
  // https://stackoverflow.com/questions/64853147/draggable-div-getting-dragged-when-input-range-slider-is-used
  onMount(() => {
    for (const e of parameterLists[effect.tag]) {
      if (e.type !== "number") continue;
      console.log(`${effect.ulid}:${e.name}`);
      const elem = document.getElementById(`${effect.ulid}:${e.name}`);
      elem.setAttribute("draggable", "true");
      elem.addEventListener("dragstart", (ev) => {
        ev.preventDefault();
      });
    }
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="list" on:click={e => e.stopPropagation()}>
  <h1>{titles[effect.tag]}</h1>
  <div class="delete-icon">
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <img src={deleteIcon} alt="delete" on:click={onDelete}/>
  </div>
  {#each parameterLists[effect.tag] as e}
    <div class="list-item">
      {#if e.type === "number"}
        <div class="row">
          <div class="label">{e.label}</div>
          <RangeSlider 
            id={`${effect.ulid}:${e.name}`}
            name={e.name} 
            bind:value={effect[e.name]} 
            min={e.min} 
            max={e.max} 
            step={e.step}/>
          <div class="number-box">
            <NumberEdit bind:value={effect[e.name]} min={e.min} max={e.max} allowDecimal={true}/>
          </div>
        </div>
      {/if}
      {#if e.type === "color"}
        <div class="row">
            <div class="label">{e.label}</div>
          <div class="color-label">
            <ColorPickerLabel bind:hex={effect[e.name]}/>
          </div>
        </div>
      {/if}
    </div>
  {/each}  
</div>

<style>
  .list {
    width: 100%;
    color: black;
    position: relative;
  }
  .list-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
  .label {
    width: 60px;
    text-align: left;
    font-size: 14px;
  }
  .row {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
  .number-box {
    width: 30px;
    height: 20px;
    display: inline-block;
    text-align: right;
    font-size: 12px;
  }
  .color-label :global(.color-picker) {
    width: 30px;
  }
  h1 {
    font-family: '源暎エムゴ';
    font-size: 16px;
  }
  .label {
    font-family: '源暎エムゴ';
    font-size: 14px;
  }
  .delete-icon {
    position: absolute;
    right: 0;
    top: 0;
    width: 16px;
    height: 16px;
  }
  .color-label {
    width: 30px;
    height: 20px;
    margin-left: 4px;
    margin-right: 4px;
  }
</style>