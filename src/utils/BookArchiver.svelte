<script lang="ts">
  import { saveAsZip } from "./saveAsZip";
  import { type BookArchiveOperation, bookArchiver } from "./bookArchiverStore";
  import { copyCanvasToClipboard } from "../lib/layeredCanvas/tools/saveCanvas";
  import { mainBook } from "../bookeditor/bookStore";

  $: onTask($bookArchiver);
  async function onTask(ba: BookArchiveOperation[]) {
    console.log("onTask", ba);
    for (let operation of ba) {
      switch (operation) {
        case 'download':
          await saveAsZip($mainBook);
          break;
        case 'copy':
          break;
        case 'export-psd':
          break;
      }
    }
    $bookArchiver = [];      
  }
</script>
