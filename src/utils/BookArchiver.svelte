<script lang="ts">
  import { saveAsZip } from "./saver/saveAsZip";
  import { copyToClipboard } from "./saver/copyToClipboard";
  import { type BookArchiveOperation, bookArchiver } from "./bookArchiverStore";
  import { mainBook, bookEditor } from "../bookeditor/bookStore";
  import { saveAsPng } from "./saver/saveAsPng";
  import { saveAsPSD } from "./saver/saveAsPSD";
  import { toastStore } from '@skeletonlabs/skeleton';
  import { postToAiPictors } from "./saver/postToAiPictors";
  import { writeEnvelope } from "../lib/book/envelope";
  import { fileSystem, loadBookFrom } from '../filemanager/fileManagerStore';
  import type { NodeId } from '../lib/filesystem/fileSystem';
  import { saveAs } from 'file-saver';
  import { exportPrompts } from "./saver/exportPrompts";
  import { getPublishUrl } from "../firebase";
  import { blobToSha1 } from '../lib/layeredCanvas/tools/misc';
  import { loading } from '../utils/loadingStore';

  $: onTask($bookArchiver);
  async function onTask(ba: BookArchiveOperation[]) {
    if (ba == null || ba.length === 0) { return; }
    console.log("onTask", ba);
    const marks: boolean[] = $bookEditor!.getMarks();
    const pages = $mainBook!.pages;
    const filteredPages = pages.filter((_, i) => marks[i]);
    const targetPages = 0 < filteredPages.length ? filteredPages : pages;

    try {
      for (let operation of ba) {
        switch (operation) {
          case 'download':
            if (targetPages.length === 1) {
              await saveAsPng(targetPages[0]);
            } else {
              await saveAsZip(targetPages);
            }
            break;
          case 'copy':
            await copyToClipboard(targetPages[0])
            break;
          case 'export-psd':
            saveAsPSD(targetPages[0]);
            break;
          case 'aipictors':
            postToAiPictors(targetPages[0]);
            break;
          case 'envelope':
            console.log("envelope", $mainBook!.revision);
            const {blob} = await makeEnvelope();
            saveAs(blob, "manga.envelope");
            break;
          case 'export-prompts':
            await exportPrompts(targetPages);
          case 'publish':
            await publishEnvelope();
            break;

        }
      }
      $bookArchiver = [];      
    }
    catch(e: any) {
      console.log(e);
      toastStore.trigger({ message: e, timeout: 1500});
    }
  }

  async function makeEnvelope() {
    const file = (await $fileSystem!.getNode($mainBook!.revision.id as NodeId))!.asFile()!;
    const book = await loadBookFrom($fileSystem!, file);
    const blob = await writeEnvelope(book);
    return {file, blob};
  }

  async function publishEnvelope() {
    $loading = true;
    try {
      const {file, blob} = await makeEnvelope();
      const {apiUrl, url, token, filename} = await getPublishUrl(`${file.id}.envelope`);
      if (url != '') {
        const sha1 = await blobToSha1(blob);
        const response = await fetch(url,{
          method: "POST",
          mode: "cors",
          body: blob,
          headers: {
            "Content-Type": "b2/x-auto",
            "Authorization": token,
            "X-Bz-File-Name": filename,
            "X-Bz-Content-Sha1": sha1,
          },
        });
        console.log(response);
      }
      const downloadUrl = `${apiUrl}/file/FramePlannerPublished/${filename}`;
      console.log("downloadUrl", downloadUrl);
      // navigator.clipboard.writeText(downloadUrl);
      toastStore.trigger({ message: "公開されました", timeout: 1500});
    }
    catch(e: any) {
      console.log(e);
      toastStore.trigger({ message: e, timeout: 1500});
    }
    finally {
      $loading = false;
    }
  }
</script>
