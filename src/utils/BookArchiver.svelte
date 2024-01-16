<script lang="ts">
  import { saveAsZip } from "./saver/saveAsZip";
  import { copyToClipboard } from "./saver/copyToClipboard";
  import { type BookArchiveOperation, bookArchiver } from "./bookArchiverStore";
  import { mainBook } from "../bookeditor/bookStore";
  import { saveAsPSD } from "./saver/saveAsPSD";

  $: onTask($bookArchiver);
  async function onTask(ba: BookArchiveOperation[]) {
    console.log("onTask", ba);
    for (let operation of ba) {
      switch (operation) {
        case 'download':
          await saveAsZip($mainBook);
          break;
        case 'copy':
          await copyToClipboard($mainBook.pages[0])
          break;
        case 'export-psd':
          saveAsPSD($mainBook.pages[0]);
          break;
      }
    }
    $bookArchiver = [];      
  }
</script>
