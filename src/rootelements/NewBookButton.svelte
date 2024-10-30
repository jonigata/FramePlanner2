<script lang="ts">
  import newBookIcon from '../assets/new-book.png';
  import { newBookToken } from "../filemanager/fileManagerStore";
  import { newBook, newImageBook } from "../lib/book/book";
  import { toolTip } from '../utils/passiveToolTipStore';
  import { hoverKey } from '../utils/hoverKeyStore';
  import { mainBook } from '../bookeditor/bookStore';
  import { createCanvasFromBlob } from '../lib/layeredCanvas/tools/imageUtil';

  async function createNewFile(e: MouseEvent) {
    if (e.ctrlKey) {
      await createNewImageFileUsingClipboard();
    } else {
      $newBookToken = newBook("not visited", "shortcut-", 0);
    }
  }

  async function createNewImageFileUsingClipboard() {
    const items = await navigator.clipboard.read();
    for (let item of items) {
      for (let type of item.types) {
        console.log(type);
        if (type.startsWith("image/")) {
          const blob = await item.getType(type);
          const canvas = await createCanvasFromBlob(blob);
          const book = newImageBook("not visited", canvas, "paste-")
          $newBookToken = book;
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
    const dt = ev.dataTransfer!;
    const files = dt.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log(file.type)
      if (file.type.startsWith("image/")) {
        const canvas = await createCanvasFromBlob(file);
        const book = newImageBook("not visited", canvas, "drop-")
        $newBookToken = book;
      }
    }
  }

  async function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey && e.key === "v") {
      await createNewImageFileUsingClipboard();
    }
  }

</script>

{#if $mainBook}
<button class="variant-ghost-tertiary text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 new-document-button hbox" 
  on:click={createNewFile}
  on:dragover={onDragOver}
  on:drop={onDrop}
  use:toolTip={`新規ドキュメント\n画像ドロップで一枚絵ドキュメント\nCtrl+クリックで画像ペースト`}
  use:hoverKey={onKeyDown}>
  <img src={newBookIcon} alt="new book" draggable="false"/>
</button>
{/if}

<style>
  .new-document-button {
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
