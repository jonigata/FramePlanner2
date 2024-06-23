<script>
  import { createEventDispatcher } from 'svelte';
  import { draggable } from '@neodrag/svelte';
  import Parameter from '../utils/Parameter.svelte';
  import FreehandInspectorEasing from './FreehandInspectorEasing.svelte';
  import FreehandInspectorTaper from './FreehandInspectorTaper.svelte';
  import FreehandInspectorPalette from './FreehandInspectorPalette.svelte';
  import { EASINGS } from './easing';
  import { deepCopyProperties } from '../lib/Misc';

  const dispatch = createEventDispatcher();

  const initialOptions = {
    size: 8,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    easing: "linear",
    simulatePressure: true,
    last: true,
    start: {
      cap: true,
      taper: 0,
      easing: "linear",
    },
    end: {
      cap: true,
      taper: 0,
      easing: "linear",
    },

    // 以下はperfect-freehandは扱わない
    strokeWidth: 0,
    isFilled: true,
    fill: "#000000",
    stroke: "#000000",
  };

  const presets = [
    {
      label: "ファイン",
      thinning: 0.5,
      smoothing: 0.5,
      easing: "linear",
      last: true,
      start: {
        taper: 100,
        easing: "linear",
      },
      end: {
        taper: 100,
        easing: "linear",
      },
    },
    {
      label: "サインペン",
      thinning: 0,
      smoothing: 0.5,
      easing: "linear",
      last: true,
      start: {
        taper: 0,
        cap: true,
      },
      end: {
        taper: 0,
        cap: true,
      },
    },
    {
      label: "フラット",
      thinning: 0,
      smoothing: 0.5,
      easing: "linear",
      last: true,
      start: {
        taper: 0,
        cap: false,
      },
      end: {
        taper: 0,
        cap: false,
      },
    },
  ]

  let options = structuredClone(initialOptions);

  function applyPreset(preset) {
    deepCopyProperties(options, preset);
    options = options;
  } 

  let strokeOptions;
  $: onChangeStrokeOptions(options);
  function onChangeStrokeOptions(options) {
    strokeOptions = structuredClone(options);
    strokeOptions.easing = EASINGS[options.easing];
    strokeOptions.start.easing = EASINGS[options.start.easing];
    strokeOptions.end.easing = EASINGS[options.end.easing];
    strokeOptions.smoothing = 1.0 - options.smoothing; 
    // smoothingの値が点間の距離の最大値の係数なので、0に近いほうが丸くなる
    // これはパラメータに関する直感とは逆なので、ここで変換している
    dispatch('setTool', strokeOptions);
  }

  function onReset() {
    options = structuredClone(initialOptions);
  }

  function onDone() {
    console.log("onDone");
    dispatch('done');
  }

</script>

<div class="toolbox variant-glass-surface rounded-container-token vbox" use:draggable={{ handle: '.title-bar' }}>
  <div class="title-bar variant-filled-surface rounded-container-token expand"></div>
  <div class="w-80 p-4">
    <div class="space-y-2 mb-4">
      <div class="parameter-box">
        <Parameter label="太さ" bind:value={options.size} min={1} max={100} step={1}/>
      </div>
      <div class="parameter-box">
        <Parameter label="太さ変化" bind:value={options.thinning} min={-1} max={1} step={0.01}/>
      </div>
      <div class="parameter-box">
        <Parameter label="流線型" bind:value={options.streamline} min={0} max={1} step={0.01}/>
      </div>
      <div class="parameter-box">
        <Parameter label="スムージング" bind:value={options.smoothing} min={0} max={1} step={0.01}/>
      </div>
      <div class="parameter-box">
        <FreehandInspectorEasing/>
      </div>

      <hr/>

      <FreehandInspectorTaper bind:taper={options.start}/>

      <hr/>

      <FreehandInspectorTaper bind:taper={options.end}/>

      <hr/>

      <div>
        <div class="flex flex-row gap-4">
          <label class="text-sm font-medium">塗りつぶし</label>
          <input class="checkbox" type="checkbox" bind:checked={options.isFilled}/>
        </div>
        {#if options.isFilled}
          <FreehandInspectorPalette on:color={(color) => options.fill = color.detail}/>
        {/if}
      </div>

      <div>
        <div class="parameter-box">
          <Parameter label="フチ" bind:value={options.strokeWidth} min={0} max={100} step={1}/>
        </div>
        {#if 0 < options.strokeWidth} 
        <FreehandInspectorPalette on:color={(color) => options.stroke = color.detail}/>
          {/if}
      </div>
    </div>

    <hr/>

    <div class="flex flex-col gap-2 mt-2">
      <span class="text-left">プリセット</span>
      {#each presets as preset}
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 w-fill" on:click={() => applyPreset(preset)}>
          {preset.label}
        </button>
      {/each}
    </div>


    <hr/>

    <div class="flex justify-between mt-4">
      <button class="bg-warning-500 text-white hover:bg-warning-700 focus:bg-warning-700 active:bg-warning-900 w-24" on:click={onReset}>
        Reset
      </button>
      <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 w-24" on:click={onDone}>
        Done
      </button>
    </div>
</div>
</div>

<style>
  .toolbox {
    position: absolute;
    display: flex;
    flex-direction: column;
    top: 200px;
    right: 240px;
    padding-bottom: 16px;
  }
  .title-bar {
    cursor: move;
    padding: 2px;
    margin: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 24px;
  }
  .parameter-box {
    display: flex;
    gap: 8px;
    align-items: center;
  }
</style>
