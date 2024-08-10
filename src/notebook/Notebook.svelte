<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { notebookOpen } from './notebookStore';
  import NotebookTextarea from './NotebookTextarea.svelte';
  import { Notebook } from './notebook';
  import { advise } from '../firebase';

  let theme = '';
  let themeWaiting = false;
  let plot = '';
  let plotWaiting = false;
  let scenario = '';
  let scenarioWaiting = false;
  
  function makeNotebook(): Notebook {
    console.log('make notebook');
    return {
      characters: [],
      theme,
      plot,
      scenario,
    }
  }

  async function onThemeAdvice(e: CustomEvent<string>) {
    console.log(e.detail);
    themeWaiting = true;
    const result = await advise({action:'theme', notebook:makeNotebook()});
    themeWaiting = false;
    console.log(result);
    theme = result.result;
  }

  async function onPlotAdvice(e: CustomEvent<string>) {
    console.log(e.detail);
    plotWaiting = true;
    const result = await advise({action:'plot', notebook:makeNotebook()});
    plotWaiting = false;
    console.log(result);
    plot = result.result;
  }
</script>

<div class="drawer-outer">
  <Drawer placement="right" open={$notebookOpen} size="720px" on:clickAway={() => $notebookOpen = false}>
    <div class="drawer-content">
      <div class="section">
        <h1>テーマ</h1>
        <div class="w-full">
          <NotebookTextarea bind:value={theme} waiting={themeWaiting} on:advise={onThemeAdvice}/>
        </div>
      </div>
      <div class="section">
        <h1>登場人物</h1>
      </div>
      <div class="section">
        <h1>プロット</h1>
        <div class="w-full">
          <NotebookTextarea bind:value={plot} waiting={plotWaiting} on:advise={onPlotAdvice} height={48}/>
        </div>
      </div>
      <div class="section">
        <h1>シナリオ</h1>
        <div class="w-full">
          <NotebookTextarea bind:value={scenario} height={96}/>
        </div>  
      </div>
    </div>
  </Drawer>
</div>

<style>
  .drawer-content {
    width: 100%;
    height: 100%;
    padding: 16px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  h1 {
    font-family: '源暎エムゴ';
    font-size: 18px;
    margin-bottom: 8px;
  }
  .section {
    margin-bottom: 16px;
  }
</style>