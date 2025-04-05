<script lang="ts">
  import { saveAsPngZip, saveAsPsdZip, makeZip } from "./saver/saveAsZip";
  import { copyToClipboard } from "./saver/copyToClipboard";
  import { type BookArchiveOperation, bookArchiver } from "./bookArchiverStore";
  import { mainBook, bookEditor } from "../bookeditor/bookStore";
  import { saveAsPng } from "./saver/saveAsPng";
  import { saveAsPsd } from "./saver/saveAsPsd";
  import { toastStore } from '@skeletonlabs/skeleton';
  import { postToAiPictors } from "./saver/postToAiPictors";
  import { writeEnvelope } from "../lib/book/envelope";
  import { fileSystem, loadBookFrom, saveBookTo } from '../filemanager/fileManagerStore';
  import type { NodeId } from '../lib/filesystem/fileSystem';
  import { saveAs } from 'file-saver';
  import { exportPrompts } from "./saver/exportPrompts";
  import { getPublishUrl, getTransportUrl, notifyShare, recordPublication } from "../supabase";
  import { blobToSha1 } from '../lib/layeredCanvas/tools/misc';
  import { loading, progress } from './loadingStore';
  import type { Book, Page } from '../lib/book/book';
  import { buildShareFileSystem } from '../filemanager/shareFileSystem';
  import { renderPageToPngBlob, renderPageToWebpBlob, renderThumbnailToWebpBlob } from './saver/renderPage';
  import { onlineStatus, onlineProfile } from './accountStore';
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
              await saveAsPngZip(targetPages);
            }
            break;
          case 'copy':
            await copyToClipboard(targetPages[0])
            break;
          case 'export-psd':
            if (targetPages.length === 1) {
              saveAsPsd(targetPages[0]);
            } else {
              saveAsPsdZip(targetPages);
            }
            break;
          case 'aipictors':
            // postToAiPictors(targetPages[0]);
            await transport(targetPages);
            break;
          case 'envelope':
            console.log("envelope", $mainBook!.revision);
            $progress = 0;
            const {blob} = await makeEnvelope(n => $progress = n);
            $progress = 1;
            saveAs(blob, "manga.envelope");
            $progress = null;
            break;
          case 'export-prompts':
            await exportPrompts(targetPages);
          case 'publish':
            await publishEnvelope();
            break;
          case 'download-publication-files':
            await downloadPublicationFiles();
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

  async function makeEnvelope(progress: (n: number) => void) {
    const file = (await $fileSystem!.getNode($mainBook!.revision.id as NodeId))!.asFile()!;
    const book = await loadBookFrom($fileSystem!, file);
    const blob = await writeEnvelope(book, progress);
    return {file, blob};
  }

  async function publishEnvelope() {
    console.log("publishEnvelope", $mainBook!.revision);
    if ($onlineStatus !== 'signed-in') {
      toastStore.trigger({ message: "公開するにはサインインが必要です", timeout: 1500});
      return;
    }

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
    console.log("progress", $progress);
    try {
      const {file, blob} = await makeEnvelope(n => $progress = n * 0.5);

      const cover = await renderPageToWebpBlob($mainBook!.pages[0]);
      const thumbnail = await renderThumbnailToWebpBlob($mainBook!.pages[0], [384, 516]);

      // 本体
      const content_url = await postFile(`${file.id}.envelope`, blob);
      $progress = 0.6;
      const cover_url = await postFile(`${file.id}_cover.webp`, cover);
      $progress = 0.7;
      const thumbnail_url = await postFile(`${file.id}_thumbnail.webp`, thumbnail);
      $progress = 0.8;
      const socialcard_url = socialCard ? await postFile(`${file.id}_socialcard.webp`, socialCard) : null;
      $progress = 0.9;

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
      currentUrl.pathname = '/viewer/' + workId.id;
      // Remove "frameplanner." prefix from the hostname if it exists
      if (currentUrl.hostname.startsWith('frameplanner.')) {
        currentUrl.hostname = currentUrl.hostname.replace('frameplanner.', '');
      }
      
      // URLをコピー
      const downloadUrl = currentUrl.toString();
      $mainBook!.attributes.publishUrl = downloadUrl;
      $bookEditor!.commit(null);
      console.log("downloadUrl", downloadUrl);
      try {
        // localhost及びhttps以外では失敗する
        await navigator.clipboard.writeText(downloadUrl);
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

  /**
   * publishEnvelopeで作成される4つのファイルを作成してダウンロードするだけの関数
   * 1. ${file.id}.envelope - 本体ファイル
   * 2. ${file.id}_cover.webp - カバー画像
   * 3. ${file.id}_thumbnail.webp - サムネイル画像
   * 4. ${file.id}_socialcard.webp - ソーシャルカード画像（オプション）
   */
  async function downloadPublicationFiles() {
    // ソーシャルカードの取得
    const r2 = await waitDialog<{socialCard: Blob}>('socialCard');
    if (!r2) {
      toastStore.trigger({ message: "ダウンロードをとりやめました", timeout: 1500});
      return;
    }
    const { socialCard } = r2;
    if (socialCard === null) {
      console.log("skipping social card");
    }
    
    $progress = 0;
    console.log("progress", $progress);
    try {
      // 本体ファイルの作成
      const {file, blob} = await makeEnvelope(n => $progress = n * 0.5);
      
      // カバーとサムネイルの作成
      const cover = await renderPageToWebpBlob($mainBook!.pages[0]);
      const thumbnail = await renderThumbnailToWebpBlob($mainBook!.pages[0], [384, 516]);

      // 各ファイルをダウンロード
      saveAs(blob, `${file.id}.envelope`);
      $progress = 0.6;
      
      saveAs(cover, `${file.id}_cover.webp`);
      $progress = 0.7;
      
      saveAs(thumbnail, `${file.id}_thumbnail.webp`);
      $progress = 0.8;
      
      if (socialCard) {
        saveAs(socialCard, `${file.id}_socialcard.webp`);
      }
      $progress = 1.0;

      toastStore.trigger({ message: "4つのファイルがダウンロードされました", timeout: 3000});
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

  async function transport(pages: Page[]) {
    let title, description;
    
    $loading = true;
    try {
      const zipFile = await makeZip(pages, renderPageToPngBlob, 'png');
      const sha1 = await blobToSha1(zipFile);
        
      let content_url;

      const {apiUrl, url, token, filename} = await getTransportUrl(`${sha1}.zip`);
      console.log("本体", apiUrl, url, token, filename);

      const response = await fetch(url,{
        method: "POST",
        mode: "cors",
        body: zipFile,
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

      // URLをコピー
      navigator.clipboard.writeText(content_url);
      toastStore.trigger({ message: `クリップボードにコピーされました`, timeout: 10000});
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
    params.set('box', fileSystem.userId!);
    params.set('file', file.id);
    url.search = params.toString();
    const shareUrl = url.toString();
    navigator.clipboard.writeText(shareUrl);
    // await notifyShare(shareUrl);

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
