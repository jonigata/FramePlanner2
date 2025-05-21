<script lang="ts">
  import { newBookToken } from "../filemanager/fileManagerStore";
  import { newBook, newImageBook } from "../lib/book/book";
  import { mainBook } from '../bookeditor/workspaceStore';
  import { createCanvasFromBlob } from '../lib/layeredCanvas/tools/imageUtil';
  import BaseRootButton from './BaseRootButton.svelte';
  import newBookIcon from '../assets/new-book.webp';
  import { excludeTextFiles } from "../lib/layeredCanvas/tools/fileUtil";
  import { dropDataHandler } from '../utils/dropDataHandler';


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

  // dropDataHandler用コールバック
  function handleDropData(mediaResources: (HTMLCanvasElement | HTMLVideoElement | string)[]) {
    const filteredResources = excludeTextFiles(mediaResources);
    const book = newImageBook("not visited", filteredResources, "drop-");
    $newBookToken = book;
  }

</script>

{#if $mainBook}
<BaseRootButton icon={newBookIcon} alt={"new book"} hint={`新規ドキュメント\n画像ドロップで一枚絵ドキュメント\nCtrl+クリックで画像ペースト`} origin={"bottomleft"} location={[0,1]} on:click={createNewFile}>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="w-full h-full"
    use:dropDataHandler={handleDropData}>
  </div>
</BaseRootButton>
{/if}
