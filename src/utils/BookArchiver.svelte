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
  import { fileSystem, loadBookFrom, saveBookTo } from '../filemanager/fileManagerStore';
  import type { NodeId } from '../lib/filesystem/fileSystem';
  import { saveAs } from 'file-saver';
  import { exportPrompts } from "./saver/exportPrompts";
  import { getPublishUrl, notifyShare, recordPublication } from "../firebase";
  import { blobToSha1 } from '../lib/layeredCanvas/tools/misc';
  import { loading } from '../utils/loadingStore';
  import type { Book } from '../lib/book/book';
  import { buildShareFileSystem } from '../filemanager/shareFileSystem';
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import { renderPageToBlob, renderThumbnailToBlob } from './saver/renderPage';

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
          case 'share-book':
            await shareBook($mainBook!);
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
    const {title, description} = await new Promise<{title:string, description: string}>((resolve) => {
      const d: ModalSettings = {
        type: 'component',
        component: 'publication',
        response: resolve,
      };
      modalStore.trigger(d);
    });    
    console.log(title, description);
    
    $loading = true;
    try {
      const {file, blob} = await makeEnvelope();
      const sha1 = await blobToSha1(blob);
      const cloudFileId = file.id

      let content_url, cover_url, thumbnail_url;

      // 本体
      {
        const {apiUrl, url, token, filename} = await getPublishUrl(`${cloudFileId}.envelope`);
        console.log("本体", apiUrl, url, token, filename);

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
        if (!response.ok) {
          throw new Error("ドキュメントのアップロードに失敗しました");
        }

        content_url = `${apiUrl}/file/FramePlannerPublished/${filename}`;
        console.log("content_url", content_url);
      }

      {
        // 表紙
        const {apiUrl, url, token, filename} = await getPublishUrl(`${cloudFileId}_cover.png`);
        console.log("表紙", url, token, filename);

        const png = await renderPageToBlob($mainBook!.pages[0]);
        const sha1 = await blobToSha1(png);
        const response = await fetch(url,{
          method: "POST",
          mode: "cors",
          body: png,
          headers: {
            "Content-Type": "b2/x-auto",
            "Authorization": token,
            "X-Bz-File-Name": filename,
            "X-Bz-Content-Sha1": sha1,
          },
        });
        console.log(response);
        if (!response.ok) {
          throw new Error("表紙のアップロードに失敗しました");
        }

        cover_url = `${apiUrl}/file/FramePlannerPublished/${filename}`;
        console.log("cover_url", cover_url);
      }

      {
        // サムネイル
        const {apiUrl, url, token, filename} = await getPublishUrl(`${cloudFileId}_thumbnail.png`);
        console.log("サムネイル", url, token, filename);

        const png = await renderThumbnailToBlob($mainBook!.pages[0], [384, 516]);
        const sha1 = await blobToSha1(png);
        const response = await fetch(url,{
          method: "POST",
          mode: "cors",
          body: png,
          headers: {
            "Content-Type": "b2/x-auto",
            "Authorization": token,
            "X-Bz-File-Name": filename,
            "X-Bz-Content-Sha1": sha1,
          },
        });
        console.log(response);
        if (!response.ok) {
          throw new Error("サムネイルのアップロードに失敗しました");
        }

        thumbnail_url = `${apiUrl}/file/FramePlannerPublished/${filename}`;
        console.log("thumbnail_url", thumbnail_url);
      }

      await recordPublication({
        title,
        description,
        content_url,
        cover_url,
        thumbnail_url,
      });

      // http://localhost:5173/viewer.html?envelope=01J9KERHBNGKW6XRRK9TJWHY6J のようなURLの作成
      // window.location.hrefにviewer.htmlは含まれてない
      const currentUrl = new URL(window.location.href);
  
      // viewer.htmlのパスを作成し、クエリパラメータを追加
      currentUrl.pathname = '/viewer.html';
      currentUrl.searchParams.set('envelope', cloudFileId);
      
      // URLをコピー
      const downloadUrl = currentUrl.toString();
      console.log(downloadUrl);
      navigator.clipboard.writeText(downloadUrl);

      toastStore.trigger({ message: "公開URLがクリップボードにコピーされました", timeout: 5000});
    }
    catch(e: any) {
      console.log(e);
      toastStore.trigger({ message: e, timeout: 1500});
    }
    finally {
      $loading = false;
    }
  }

  async function shareBook(book: Book) {
    $loading = true;

    console.log("shareBook");
    const fileSystem = await buildShareFileSystem(null);
    const file = await fileSystem.createFile('text');
    await saveBookTo(book, fileSystem, file);
    console.log(file.id);

    // URL作成
    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.set('box', fileSystem.boxId!);
    params.set('file', file.id);
    url.search = params.toString();
    const shareUrl = url.toString();
    navigator.clipboard.writeText(shareUrl);
    await notifyShare(shareUrl);

    $loading = false;
    toastStore.trigger({ message: "クリップボードにシェアURLをコピーしました<br/>この機能は共有を目的としたもので、<br/>一定時間後消去される可能性があります", timeout: 4500});
  }

</script>
