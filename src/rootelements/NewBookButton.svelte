<script lang="ts">
  import { newBookToken } from "../filemanager/fileManagerStore";
  import { newBook, newImageBook } from "../lib/book/book";
  import { hoverKey } from '../utils/hoverKeyStore';
  import { mainBook } from '../bookeditor/bookStore';
  import { createCanvasFromBlob } from '../lib/layeredCanvas/tools/imageUtil';
  import BaseRootButton from './BaseRootButton.svelte';
  import newBookIcon from '../assets/new-book.png';

  async function createNewFile(e: CustomEvent<MouseEvent>) {
    if (e.detail.ctrlKey) {
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
<BaseRootButton icon={newBookIcon} alt={"new book"} hint={`新規ドキュメント\n画像ドロップで一枚絵ドキュメント\nCtrl+クリックで画像ペースト`} origin={"bottomleft"} location={[0,1]} on:click={createNewFile}>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="w-full h-full"
    on:dragover={onDragOver}
    on:drop={onDrop}
    use:hoverKey={onKeyDown}>
  </div>
</BaseRootButton>
{/if}
