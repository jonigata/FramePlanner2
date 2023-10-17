<script type="ts">
  import fileManagerIcon from './assets/file-manager.png';
  import { fileManagerOpen } from './fileManagerStore';
  
  function openFileManager() {
    $fileManagerOpen = !$fileManagerOpen;
  }
</script>

<button class="variant-ghost-tertiary text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 open-button hbox" on:click={openFileManager}>
  <img src={fileManagerIcon} alt="file manager"/>
</button>

<style>
  .open-button {
    pointer-events: auto;
    position: absolute;
    width: 120px;
    height: 120px;
    bottom: 20px;
    left: 20px;
  }
  img {
    width: 80%;
    height: 80%;
  }
</style>
