<script type="ts">
  import newFileIcon from './assets/new-file.png';
  import { newPage, newImagePage, newFileToken } from "./fileManagerStore";

  async function createNewFile() {
    $newFileToken = newPage("shortcut-", 0);
  }

  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  async function onDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    const dt = ev.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log(file.type)
      if (file.type.startsWith("image/")) {
        const imageURL = URL.createObjectURL(file);
        const image = new Image();

        const imageLoaded = new Promise((resolve) => image.onload = resolve);          
        image.src = imageURL;
        await imageLoaded;
        URL.revokeObjectURL(imageURL); // オブジェクトURLのリソースを解放

        const page = newImagePage(image, "drop-")
        $newFileToken = page;
      }
    }
  }
</script>

<button class="variant-ghost-tertiary text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 new-file-button hbox" 
  on:click={createNewFile}
  on:dragover={onDragOver}
  on:drop={onDrop}>
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
