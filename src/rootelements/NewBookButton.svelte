<script lang="ts">
  import { newBookToken } from "../filemanager/fileManagerStore";
  import { newBook, newImageBook } from "../lib/book/book";
  import { hoverKey } from '../utils/hoverKeyStore';
  import { mainBook } from '../bookeditor/workspaceStore';
  import { createCanvasFromBlob } from '../lib/layeredCanvas/tools/imageUtil';
  import { excludeTextFiles, handleDataTransfer } from "../lib/layeredCanvas/tools/fileUtil";

  import BaseRootButton from './BaseRootButton.svelte';
  import newBookIcon from '../assets/new-book.webp';


  async function createNewFile(e: CustomEvent<MouseEvent>) {
    if (e.detail.ctrlKey) {
      await createNewImageFileUsingClipboard();
    } else {
      $newBookToken = newBook("not visited", "shortcut-", "standard");
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
          const book = newImageBook("not visited", [canvas], "paste-")
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

    const mediaResources = await handleDataTransfer(ev.dataTransfer!);
    const filteredResources = excludeTextFiles(mediaResources);
    const book = newImageBook("not visited", filteredResources, "drop-")
    $newBookToken = book;
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
