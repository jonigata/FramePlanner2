<script lang="ts">
  import titleBarIcon from '../assets/title-control-panel.png';
  import { controlPanelOpened } from '../controlpanel/controlPanelStore';
  
</script>

<div class="w-screen h-8 bg-surface-900 text-slate-100 gap-8 flex items-center pl-4">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <img class="title-image" src={titleBarIcon} alt="title" on:click={() => $controlPanelOpened = !$controlPanelOpened}/> 
</div>

<style>
  .title-image {
    width: 24px;
    height: 24px;
  }
</style>
