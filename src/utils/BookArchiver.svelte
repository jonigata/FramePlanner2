<script lang="ts">
  import { saveAsZip } from "./saver/saveAsZip";
  import { copyToClipboard } from "./saver/copyToClipboard";
  import { type BookArchiveOperation, bookArchiver } from "./bookArchiverStore";
  import { mainBook } from "../bookeditor/bookStore";
  import { saveAsPng } from "./saver/saveAsPng";
  import { saveAsPSD } from "./saver/saveAsPSD";
  import { toastStore } from '@skeletonlabs/skeleton';
  import { postToAiPictors } from "./saver/postToAiPictors";

  $: onTask($bookArchiver);
  async function onTask(ba: BookArchiveOperation[]) {
    console.log("onTask", ba);
    try {
      for (let operation of ba) {
        switch (operation) {
          case 'download':
            if ($mainBook.pages.length === 1) {
              await saveAsPng($mainBook.pages[0]);
            } else {
              await saveAsZip($mainBook);
            }
            break;
          case 'copy':
            await copyToClipboard($mainBook.pages[0])
            break;
          case 'export-psd':
            saveAsPSD($mainBook.pages[0]);
            break;
          case 'aipictors':
            postToAiPictors($mainBook.pages[0]);
            break;
        }
      }
      $bookArchiver = [];      
    }
    catch(e) {
      toastStore.trigger({ message: e, timeout: 1500});
    }
  }
</script>
