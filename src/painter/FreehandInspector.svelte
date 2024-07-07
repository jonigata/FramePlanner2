<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { draggable } from '@neodrag/svelte';
  import Parameter from '../utils/Parameter.svelte';
  import FreehandInspectorEasing from './FreehandInspectorEasing.svelte';
  import FreehandInspectorTaper from './FreehandInspectorTaper.svelte';
  import FreehandInspectorPalette from './FreehandInspectorPalette.svelte';
  import { EASINGS } from './easing';
  import { deepCopyProperties } from '../lib/Misc';
	import ColorPicker from 'svelte-awesome-color-picker';

  const dispatch = createEventDispatcher();

  type StrokeOperation = "strokeWithfill" | "stroke" | "erase";

  const initialOptions = {
    size: 8,
    thinning: 0.5,
    smoothing: 0.6,
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
    strokeOperation: "strokeWithFill",
    fill: "#000000",
    stroke: "#ffffff",
  };

  const presets = [
    {
      label: "ファイン",
      thinning: 0.5,
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
      strokeOperation: "strokeWithFill",
    },
    {
      label: "サインペン",
      thinning: 0,
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
      strokeOperation: "strokeWithFill",
    },
    {
      label: "フラット",
      thinning: 0,
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
      strokeOperation: "strokeWithFill",
    },
    {
      label: "消しゴム",
      thinning: 0,
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
      strokeOperation: "erase",
    }    
  ]

  let options = structuredClone(initialOptions);
  let fillTheme = options.fill;
  let strokeTheme = options.stroke;

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

  function onSyncThemeColor() {
    strokeTheme = fillTheme;
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
        <div class="flex flex-row gap-4 items-center">
          <label class="flex items-center gap-2"><span>塗りつぶし</span>
            <select class="select" bind:value={options.strokeOperation}>
              <option value={"strokeWithFill"}>塗りつぶし</option>
              <option value={"stroke"}>フチのみ</option>
              <option value={"erase"}>消しゴム</option>
            </select>
          </label>            
          {#if options.strokeOperation != "erase" && 0 < options.strokeWidth}
            <button class="btn btn-sm variant-filled h-6" on:click={onSyncThemeColor}>
              テーマカラーを同期
            </button>
          {/if}
        </div>

        {#if options.strokeOperation == "strokeWithFill"}
          <FreehandInspectorPalette bind:color={options.fill} bind:themeColor={fillTheme}/>
        {/if}

        {#if options.strokeOperation != "erase"}
          <div class="parameter-box">
            <Parameter label="フチ" bind:value={options.strokeWidth} min={0} max={100} step={1}/>
          </div>
        {/if}
        {#if 0 < options.strokeWidth} 
          <FreehandInspectorPalette bind:color={options.stroke} bind:themeColor={strokeTheme}/>
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
