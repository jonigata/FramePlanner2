<script type="ts">
  import newFileIcon from './assets/new-file.png';
  import { newPage, newFileToken } from "./fileManagerStore";

  async function createNewFile() {
    $newFileToken = newPage("shortcut-", 0);
  }
</script>

<button class="variant-ghost-tertiary text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 new-file-button hbox" on:click={createNewFile}>
  <img src={newFileIcon} alt="file manager"/>
</button>

<style>
  .new-file-button {
    pointer-events: auto;
    position: absolute;
    width: 160px;
    height: 160px;
    bottom: 200px;
    left: 20px;
  }
</style>
