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
  import { loading, progress } from './loadingStore';
  import type { Book } from '../lib/book/book';
  import { buildShareFileSystem } from '../filemanager/shareFileSystem';
  import { renderPageToBlob, renderThumbnailToBlob } from './saver/renderPage';
  import { onlineProfile } from './accountStore';
  import { waitDialog } from "./waitDialog";

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
    $progress = 0;
    const file = (await $fileSystem!.getNode($mainBook!.revision.id as NodeId))!.asFile()!;
    const book = await loadBookFrom($fileSystem!, file);
    const blob = await writeEnvelope(book, (n) => $progress = n);
    $progress = null;
    return {file, blob};
  }

  async function publishEnvelope() {
    if ($onlineProfile === null) {
      toastStore.trigger({ message: "公開するにはユーザー情報の登録が必要です", timeout: 1500});
      const r = await waitDialog<boolean>('userProfile');
      if (!r) {
        toastStore.trigger({ message: "公開をとりやめました", timeout: 1500});
        return;
      }
    }

    const r = 
      await waitDialog<{title:string, description: string, related_url: string, is_public: boolean}>('publication');
    if (!r) {
      toastStore.trigger({ message: "公開をとりやめました", timeout: 1500});
      return;
    }
    const { title, description, related_url, is_public } = r;

    // const { title, description, related_url } = { title: "", description: "", related_url: "" };
    // 直ちに実行すると自動的に閉じてしまうようなので待つ(多分svelte skeletonのアニメーション処理のバグ)
    await new Promise(resolve => setTimeout(resolve, 500));

    const r2 = await waitDialog<{socialCard: Blob}>('socialCard');
    if (!r2) {
      toastStore.trigger({ message: "公開をとりやめました", timeout: 1500});
      return;
    }
    const { socialCard } = r2;
    if (socialCard === null) {
      console.log("skipping social card");
    }
    
    $progress = 0;
    try {
      const {file, blob} = await makeEnvelope();

      const cover = await renderPageToBlob($mainBook!.pages[0]);
      const thumbnail = await renderThumbnailToBlob($mainBook!.pages[0], [384, 516]);

      // 本体
      const content_url = await postFile(`${file.id}.envelope`, blob);      
      $progress = 0.2;
      const cover_url = await postFile(`${file.id}_cover.png`, cover);
      $progress = 0.4;
      const thumbnail_url = await postFile(`${file.id}_thumbnail.png`, thumbnail);
      $progress = 0.6;
      const socialcard_url = socialCard ? await postFile(`${file.id}_socialcard.png`, socialCard) : null;
      $progress = 0.8;

      console.log("recordPublication", {
        title,
        description,
        content_url,
        cover_url,
        thumbnail_url,
        socialcard_url,
        related_url,
        is_public,
      });
      const workId = await recordPublication({
        title,
        description,
        content_url,
        cover_url,
        thumbnail_url,
        socialcard_url,
        related_url,
        is_public,
      });
      $progress = 1.0;

      // http://localhost:5173/viewer/01J9KERHBNGKW6XRRK9TJWHY6J のようなURLの作成
      const currentUrl = new URL(window.location.href);
      currentUrl.pathname = '/viewer/' + workId;
      
      // URLをコピー
      const downloadUrl = currentUrl.toString();
      console.log(downloadUrl);
      try {
        navigator.clipboard.writeText(downloadUrl);
        toastStore.trigger({ message: `<a target="_blank" href="${downloadUrl}"><span class="text-yellow-200">公開URL</span></a>がクリップボードにコピーされました`, timeout: 10000});
      }
      catch(e) {
        console.log(e);
        toastStore.trigger({ message: `<a target="_blank" href="${downloadUrl}"><span class="text-yellow-200">公開URL</span></a>をクリップボードにコピーできませんでした。タブがアクティブでなかったためかもしれません。`});
      }
    }
    catch(e: any) {
      console.log(e);
      toastStore.trigger({ message: e, timeout: 1500});
    }
    finally {
      // 0.5秒待つ
      await new Promise(resolve => setTimeout(resolve, 500));
      $progress = null;
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

  async function postFile(sourceFilename: string, blob: Blob) {
    const {apiUrl, url, token, filename} = await getPublishUrl(sourceFilename);
    console.log("本体", apiUrl, url, token, filename);

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
    if (!response.ok) {
      throw new Error("ドキュメントのアップロードに失敗しました");
    }

    return `${apiUrl}/file/FramePlannerPublished/${filename}`;
  }

</script>
