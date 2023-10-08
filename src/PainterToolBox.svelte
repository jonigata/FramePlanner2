<script type="ts">
  import { draggable } from '@neodrag/svelte';
  import PainterTool from './PainterTool.svelte';
  import { createEventDispatcher, onMount } from 'svelte';

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
    const chosenTool = tools.find(tool => tool.id === e.detail.id);
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

  onMount(() => {
    console.log("onMount");
    reset();
    dispatch('setTool', tools[0]);
  });
</script>

<div class="control-panel variant-glass-surface rounded-container-token vbox" use:draggable={{ handle: '.title-bar' }}>
  <div class="title-bar variant-filled-surface rounded-container-token expand"></div>
  <div class="inner expand hbox gap-0.5">
    {#each tools as tool}
    <!-- いまのところtoolにはbrushしかない -->
    <PainterTool brush={tool} label={tool.name} on:choose={onChoose} on:change={onChange}/>
    {/each}
    <span style="width:20px;"></span>
    <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 done-button" on:click={onDone}>
      Done
    </button>
  </div>
</div>


<style>
  .control-panel {
    position: absolute;
    display: flex;
    flex-direction: column;
    bottom: 200px;
    left: 200px;
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
</style>
