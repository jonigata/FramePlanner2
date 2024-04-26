<script lang="ts">
  import { saveAsZip } from "./saver/saveAsZip";
  import { copyToClipboard } from "./saver/copyToClipboard";
  import { type BookArchiveOperation, bookArchiver } from "./bookArchiverStore";
  import { mainBook, bookEditor } from "../bookeditor/bookStore";
  import { saveAsPng } from "./saver/saveAsPng";
  import { saveAsPSD } from "./saver/saveAsPSD";
  import { toastStore } from '@skeletonlabs/skeleton';
  import { postToAiPictors } from "./saver/postToAiPictors";

  $: onTask($bookArchiver);
  async function onTask(ba: BookArchiveOperation[]) {
    if (ba == null || ba.length === 0) { return; }
    console.log("onTask", ba);
    const marks: boolean[] = $bookEditor.getMarks();
    function onePage() {
      const pages = $mainBook.pages;
      const filteredPages = pages.filter((_, i) => marks[i]);
      if (0 < filteredPages.length) {
        return filteredPages[0];
      } else {
        return pages[0];
      }
    }

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
            await copyToClipboard(onePage())
            break;
          case 'export-psd':
            saveAsPSD(onePage());
            break;
          case 'aipictors':
            postToAiPictors(onePage());
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
