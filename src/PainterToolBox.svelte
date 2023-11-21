<script lang="ts">
  import { draggable } from '@neodrag/svelte';
  import PainterTool from './PainterTool.svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import PainterCanvas from './PainterCanvas.svelte';
  import type { FrameElement } from './lib/layeredCanvas/frameTree';

  export let element: FrameElement;

  let chosenTool = null;
  let lcm = true;
  let autoGeneration = true;
  let canvas;
  
  const dispatch = createEventDispatcher();

  let tools = [
    { id: 0, name: "pen", strokeStyle: '#000000', lineWidth: 2, selected: true },
    { id: 1, name: "pen", strokeStyle: '#000000', lineWidth: 5, selected: false  },
    { id: 2, name: "green", strokeStyle: '#31CC00', lineWidth: 5, selected: false  },
    { id: 3, name: "blue", strokeStyle: '#1600B9', lineWidth: 5, selected: false  },
    { id: 4, name: "eraser", strokeStyle: '#ffffff', lineWidth: 80, selected: false  },
  ];

  function reset() {
    console.log("reset");
    tools.forEach(tool => tool.selected = tool.id === 0);
  }

  function onChoose(e: CustomEvent<any>) {
    console.log(e.detail);
    tools = tools.map(tool => ({ ...tool, selected: false }));

    // 選択されたツールの選択状態を更新
    chosenTool = tools.find(tool => tool.id === e.detail.id);
    chosenTool.selected = true;

    dispatch('setTool', e.detail);
  }

  function onChange(e: CustomEvent<any>) {
    const targetTool = tools.find(tool => tool.id === e.detail.id);
    targetTool.strokeStyle = e.detail.strokeStyle;
    targetTool.lineWidth = e.detail.lineWidth;
    if (targetTool.selected) {
      dispatch('setTool', targetTool);
    }
  }

  function onDone() {
    console.log("onDone");
    dispatch('done');
  }

  function onRedraw() {
    console.log("onRedraw");
    canvas.generate();
  }

  onMount(() => {
    reset();
    dispatch('setTool', tools[0]);
  });
</script>

<div class="toolbox variant-glass-surface rounded-container-token vbox" use:draggable={{ handle: '.title-bar' }}>
  <div class="title-bar variant-filled-surface rounded-container-token expand"></div>
  <div class="inner expand hbox gap-0.5">
    {#each tools as tool}
    <!-- いまのところtoolにはbrushしかない -->
    <PainterTool brush={tool} label={tool.name} on:choose={onChoose} on:change={onChange}/>
    {/each}
    <span style="width:20px;"></span>
  </div>
  <div class="prompt-container">
    <textarea class="prompt" placeholder="prompt" bind:value={element.prompt}></textarea>
  </div>
  <div class="canvas-container">
    <div class="canvas-left">
      <div>
        <input type="checkbox" bind:checked={autoGeneration}/>自動AI生成
      </div>
      <div>
        <input type="checkbox" bind:checked={lcm}/>LCM
      </div>
      <div class="vfill"/>
      <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 done-button" on:click={onRedraw}>
        Redraw
      </button>
      <div class="h-4"/>
      <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 done-button" on:click={onDone}>
        Done
      </button>
    </div>
    <PainterCanvas scribbleImage={element.scribble} targetImage={element.image} bind:tool={chosenTool} bind:prompt={element.prompt} bind:autoGeneration={autoGeneration} bind:lcm={lcm} bind:this={canvas}/>
  </div>
</div>


<style>
  .toolbox {
    position: absolute;
    display: flex;
    flex-direction: column;
    bottom: 200px;
    left: 200px;
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
  .inner {
    padding: 8px;
  }
  .done-button {
    width: 120px;
    height: 40px;
  }
  .canvas-container {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    padding: 8px;
  } 
  .canvas-left {
    width: 140px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .prompt-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    height: 96px;
  } 
  .prompt {
    width: 100%;
    height: 100%;
  }
  .vfill {
    flex-grow: 1;
  }
</style>
