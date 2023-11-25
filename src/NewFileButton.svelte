<script lang="ts">
  import newFileIcon from './assets/new-file.png';
  import { newFileToken } from "./filemanager/fileManagerStore";
  import { newPage, newImagePage } from "./pageStore";
  import { toolTip } from './utils/passiveToolTipStore';
  import { hoverKey } from './utils/hoverKeyStore';

  async function createNewFile(e: MouseEvent) {
    if (e.ctrlKey) {
      await createNewImageFile();
    } else {
      $newFileToken = newPage("shortcut-", 0);
    }
  }

  async function createNewImageFile() {
    const items = await navigator.clipboard.read();
    for (let item of items) {
      for (let type of item.types) {
        console.log(type);
        if (type.startsWith("image/")) {
          const blob = await item.getType(type);
          const imageURL = URL.createObjectURL(blob);
          const image = new Image();

          const imageLoaded = new Promise((resolve) => image.onload = resolve);          
          image.src = imageURL;
          await imageLoaded;
          URL.revokeObjectURL(imageURL); // オブジェクトURLのリソースを解放

          const page = newImagePage(image, "paste-")
          $newFileToken = page;
          return;
        }
      }
    }
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

  async function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey && e.key === "v") {
      await createNewImageFile();
    }
  }

</script>

<button class="variant-ghost-tertiary text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 new-file-button hbox" 
  on:click={createNewFile}
  on:dragover={onDragOver}
  on:drop={onDrop}
  use:toolTip={`新規ページ\n画像ドロップで一枚絵ページ\nCtrl+クリックで画像ペースト`}
  use:hoverKey={onKeyDown}>
  <img src={newFileIcon} alt="file manager"/>
</button>

<style>
  .new-file-button {
    pointer-events: auto;
    position: absolute;
    width: 120px;
    height: 120px;
    bottom: 160px;
    left: 20px;
  }
  img {
    width: 80%;
    height: 80%;
  }
</style>
