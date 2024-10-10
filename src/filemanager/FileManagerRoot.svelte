<script lang="ts">
  import { onMount } from 'svelte';
  import { fileManagerUsedSizeToken, fileManagerOpen, saveBookTo, loadBookFrom, getCurrentDateTime, newBookToken, saveBubbleToken, newFile, fileManagerMarkedFlag, saveBubbleTo, shareBookToken, loadToken, type LoadToken, mainBookFileSystem } from "./fileManagerStore";
  import type { FileSystem, NodeId, Folder, EmbodiedEntry } from '../lib/filesystem/fileSystem';
  import type { Book } from '../bookeditor/book';
  import { newBook, revisionEqual, commitBook, getHistoryWeight, collectAllFilms } from '../bookeditor/book';
  import { bookEditor, mainBook } from '../bookeditor/bookStore';
  import type { Revision } from "../bookeditor/book";
  import { recordCurrentFileInfo, fetchCurrentFileInfo, type CurrentFileInfo } from './currentFile';
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import type { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import { buildShareFileSystem, buildCloudFileSystem } from './shareFileSystem';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { getAnalytics, logEvent } from "firebase/analytics";
  import { getLayover, notifyShare } from "../firebase";
  import { createPage } from '../utils/fromHiruma';
  import Drawer from '../utils/Drawer.svelte'
  import FileManagerFolder from './FileManagerFolder.svelte';
  import { collectGarbage } from '../utils/garbageCollection';
  import { browserStrayImages, browserUsedImages } from '../utils/fileBrowserStore';
  import type { IndexedDBFileSystem } from '../lib/filesystem/indexeddbFileSystem';
  import { DelayedCommiter } from '../utils/delayedCommiter';
  import { loading } from '../utils/loadingStore'
  import { toolTip } from '../utils/passiveToolTipStore';
  import { frameInspectorTarget } from '../bookeditor/frameinspector/frameInspectorStore';
  import { saveProhibitFlag } from '../utils/developmentFlagStore';
  import { mascotVisible } from '../mascot/mascotStore';
  import { effectProcessorQueue } from '../utils/effectprocessor/effectProcessorStore';
  import { createImageFromCanvas } from '../utils/imageUtil';
  import { emptyNotebook } from '../notebook/notebook';
  import { onlineStatus, type OnlineStatus } from '../utils/accountStore';
  import { waitForChange } from '../utils/reactUtil';
  import { writable } from 'svelte/store';

  export let fileSystem: FileSystem;

  let root: Folder = null;
  let desktop: EmbodiedEntry = null;
  let cabinet: EmbodiedEntry = null;
  let trash: EmbodiedEntry = null;

  let cloudFileSystem: FileSystem = null;
  let cloudRoot: Folder = null;
  let cloudCabinet: EmbodiedEntry = null;
  let cloudTrash: EmbodiedEntry = null;
  const cloudReady = writable(false);

  let usedSize: string;

  $: onBuildCloudFileSystem($onlineStatus);
  async function onBuildCloudFileSystem(status: OnlineStatus) { 
    if (status != 'signed-in') { return; }
    cloudFileSystem = await buildCloudFileSystem();

    cloudRoot = await cloudFileSystem.getRoot();
    cloudCabinet = await cloudRoot.getEmbodiedEntryByName("キャビネット");
    cloudTrash = await cloudRoot.getEmbodiedEntryByName("ごみ箱");
    $cloudReady = true;
  }

  // let templates: [BindId, string, Node] = null;
  let currentRevision: Revision = null;
  let delayedCommiter = new DelayedCommiter(
    async () => {
      const book = $mainBook;
      if (!$saveProhibitFlag) {
        const file = await $mainBookFileSystem.getNode(book.revision.id as NodeId);
        await saveBookTo(book, $mainBookFileSystem, file.asFile());
      }
      currentRevision = {...book.revision};
      const info: CurrentFileInfo = {
        id: book.revision.id as NodeId,
        fileSystem: $mainBookFileSystem.id === fileSystem.id ? 'local' : 'cloud',
      }
      await recordCurrentFileInfo(info);
    });
  let undumpCounter = 0;

  $: onOpen($fileManagerOpen);
  async function onOpen(open: boolean) {
    if (open) {
      $fileManagerMarkedFlag = $bookEditor.getMarks().some((m) => m);
      $fileManagerUsedSizeToken = fileSystem;
      console.log("used size updated");
    }
  }

  $: onUsedSizeUpdate($fileManagerUsedSizeToken);
  async function onUsedSizeUpdate(fs: FileSystem) {
    usedSize = formatMillions(await fileSystem.collectTotalSize());
  }

  $:onUpdateBook($mainBook);
  async function onUpdateBook(book: Book) {
    if (book == null) {
      try {
        $loading = true;

        if (await loadSharedBook()) {
          // shared bookがある場合、内部でリダイレクトする
          return;
        }

        const currentFileInfo = await fetchCurrentFileInfo();
        if (currentFileInfo) {
          if (currentFileInfo.fileSystem === 'cloud') {
            toastStore.trigger({ message: "最終アクセスファイルがクラウドファイルのため、\nクラウドストレージの接続を待っています", timeout: 3000});
            await waitForChange(onlineStatus, s => s != 'unknown');
            if ($onlineStatus === 'signed-out') {
              toastStore.trigger({ message: "クラウドストレージに接続できませんでした", timeout: 3000});
            } else {
              await waitForChange(cloudReady, x => x);
            }
            toastStore.trigger({ message: "クラウドファイルの読み込みには\n時間がかかることがあります", timeout: 3000});
          }
          console.log($onlineStatus);
          const fs = currentFileInfo.fileSystem === 'local' ? fileSystem : cloudFileSystem;
          let currentFile = await fs.getNode(currentFileInfo.id);
          const newBook = await loadBookFrom(fs, currentFile.asFile());
          refreshFilms(newBook);
          currentRevision = {...newBook.revision};
          console.snapshot(newBook.pages[0]);
          $mainBookFileSystem = fileSystem;
          $mainBook = newBook;
          $frameInspectorTarget = null;
          logEvent(getAnalytics(), 'continue_book');
          return;
        }

        // 初起動またはクラウドストレージ接続失敗の場合デスクトップにセーブ
        const root = await fileSystem.getRoot();
        const desktop = await root.getNodeByName("デスクトップ");
        book = newBook('not visited', "initial-", 0);
        await newFile(fileSystem, desktop.asFolder(), getCurrentDateTime(), book);
        await recordCurrentFileInfo({ id: book.revision.id as NodeId, fileSystem: 'local' });

        currentRevision = {...book.revision};
        $mainBookFileSystem = fileSystem;
        $mainBook = book;
        logEvent(getAnalytics(), 'new_book');
      }
      finally {
        $loading = false;
      }
    } else {
      if (revisionEqual(book.revision, currentRevision)) {
        return;
      }

      // 普通のオートセーブ
      if (getHistoryWeight(book) == 'heavy') {
        delayedCommiter.cancel();
        delayedCommiter.schedule(0);
      } else {
        delayedCommiter.schedule(2000);
      }
    }
  }

  async function loadSharedBook(): Promise<boolean> {
    console.log("loadSharedBook");
    const localFileSystem = fileSystem; // ややこしいのでalias
    const localRoot = await localFileSystem.getRoot();
    const localDesktop = (await localRoot.getNodeByName("デスクトップ")).asFolder();

    const urlParams = new URLSearchParams(window.location.search);
    console.log("URLParams", urlParams);
    if (urlParams.has('box') && urlParams.get('file')) {
      logEvent(getAnalytics(), 'shared');
      const box = urlParams.get('box');
      const file = urlParams.get('file');
      console.log("box:file = ", box, file);

      if (await localFileSystem.getNode(file as NodeId) == null) {
        // 読んだことがなければ読み込んでローカルに保存
        console.log("shared page load from server", window.location.href);
        const remoteFileSystem = await buildShareFileSystem(box);
        const remoteFile = await remoteFileSystem.getNode(file as NodeId);
        const book = await loadBookFrom(remoteFileSystem, remoteFile.asFile());

        const localFile = await localFileSystem.createFileWithId(file as NodeId);
        await saveBookTo(book, localFileSystem, localFile);
        await localDesktop.link("シェア " + getCurrentDateTime(), localFile.id);
      }
      await recordCurrentFileInfo({id: file as NodeId, fileSystem: 'local'});
    } else if (urlParams.has('build')) {
      console.log("loadSharedBook: build");
      logEvent(getAnalytics(), 'layover');
      const build = urlParams.get('build');
      const storyboard = await getLayover(build);
      console.log(storyboard);

      const page = createPage(storyboard.pages[0], '');

      const localFile = await localFileSystem.createFile();
      const book: Book = {
        revision: { id: localFile.id, revision:1, prefix: 'hiruma-' },
        pages: [page],
        history: { entries: [], cursor: 0 },
        direction: 'right-to-left',
        wrapMode: 'none',
        chatLogs: [],
        notebook: emptyNotebook(),
      }
      commitBook(book, null);
      await saveBookTo(book, localFileSystem, localFile);
      await localDesktop.link(getCurrentDateTime(), localFile.id);
      await recordCurrentFileInfo({id: localFile.id as NodeId, fileSystem: 'local'});
    } else if (urlParams.has('reset')) {
      await recordCurrentFileInfo(undefined);
    } else {
      return false;
    }

    // いずれにせよリダイレクト
    let currentUrl = new URL(window.location.href);
    let urlWithoutQuery = currentUrl.origin + currentUrl.pathname;      

    window.history.replaceState(null, null, urlWithoutQuery);
    window.location.href = urlWithoutQuery;
    return true;
  }

  $:onNewBookRequest($newBookToken);
  async function onNewBookRequest(book: Book) {
    if (book) {
      console.tag("new book request", "green");
      $mascotVisible = false;
      $newBookToken = null;
      const root = await fileSystem.getRoot();
      const desktop = await root.getNodeByName("デスクトップ");
      const { file } = await newFile(fileSystem, desktop.asFolder(), getCurrentDateTime(), book);
      await recordCurrentFileInfo({id: file.id as NodeId, fileSystem: 'local'});
      currentRevision = {...book.revision};
      $mainBookFileSystem = fileSystem;
      $mainBook = book;
      $frameInspectorTarget = null;
      logEvent(getAnalytics(), 'new_book');
    }
  }

  $:onNewBubbleRequest($saveBubbleToken);
  async function onNewBubbleRequest(bubble: Bubble) {
    if (!bubble) { return; }
    console.log("onNewBalloonRequest");
    $saveBubbleToken = null;
    const root = await fileSystem.getRoot();
    const folder = await root.getNodeByName("テンプレート");
    const file = await fileSystem.createFile();
    await saveBubbleTo(bubble, file);
    await folder.asFolder().link(getCurrentDateTime(), file.id);
  }

  $:onSharePageRequest($shareBookToken);
  async function onSharePageRequest(book: Book) {
    if (!book) { return; }
    $loading = true;

    console.log("onSharePageRequest");
    $shareBookToken = null;
    const fileSystem = await buildShareFileSystem(null);
    const file = await fileSystem.createFile('text');
    await saveBookTo(book, fileSystem, file);
    console.log(file.id);

    // URL作成
    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.set('box', fileSystem.boxId);
    params.set('file', file.id);
    url.search = params.toString();
    const shareUrl = url.toString();
    navigator.clipboard.writeText(shareUrl);
    await notifyShare(shareUrl);

    $loading = false;
    toastStore.trigger({ message: "クリップボードにシェアURLをコピーしました<br/>この機能は共有を目的としたもので、\n一定時間後消去される可能性があります", timeout: 4500});
  }

  $:onLoadRequest($loadToken);
  async function onLoadRequest(lt: LoadToken) {
    if (!lt) { return; }
    $loadToken = null;
    $mascotVisible = false;

    $loading = true;
    const isCloud = lt.fileSystem.id !== fileSystem.id;
    if (isCloud) {
      toastStore.trigger({ message: "クラウドファイルの読み込みには\n時間がかかることがあります", timeout: 3000});
    }
    const file = (await lt.fileSystem.getNode(lt.nodeId)).asFile();
    const book = await loadBookFrom(lt.fileSystem, file);
    refreshFilms(book);
    currentRevision = {...book.revision};
    $mainBookFileSystem = lt.fileSystem;
    $mainBook = book;
    recordCurrentFileInfo({id: book.revision.id as NodeId, fileSystem: isCloud ? 'cloud' : 'local'});
    $frameInspectorTarget = null;
    $loading = false;
  }

  async function displayStoredImages() {
    $loading = true;
    const { usedImageFiles, strayImageFiles } = await collectGarbage(fileSystem);

    const usedImages = [];
    for (const imageFile of usedImageFiles) {
      const file = await fileSystem.getNode(imageFile as NodeId);
      const canvas = await file.asFile().readCanvas();
      const image = await createImageFromCanvas(canvas);
      console.log("loaded used image", imageFile);
      usedImages.push(image);
    }

    const strayImages = [];
    for (const imageFile of strayImageFiles) {
      const file = await fileSystem.getNode(imageFile as NodeId);
      const canvas = await file.asFile().readCanvas();
      const image = await createImageFromCanvas(canvas);
      console.log("loaded stray image", imageFile);
      strayImages.push(image);
    }

    $browserUsedImages = usedImages;
    $browserStrayImages = strayImages;
    $loading = false;

    const d: ModalSettings = {
      type: 'component',
      component: 'fileBrowser',
    };
    modalStore.trigger(d);    
  }

  function formatMillions(number) {
    return (number / 1000000).toFixed(2) + 'M';
  }

  async function dumpFileSystem() {
    $loading = true;
    await (fileSystem as IndexedDBFileSystem).dump();
    $loading = false;
  }

  let dumpFiles;
  $: onUndumpFileSystem(dumpFiles);
  async function onUndumpFileSystem(dumpFiles) {
    if (dumpFiles) {
      undumpCounter = 0;
    }
  }

  let importFiles;
  $: onImportFile(importFiles);
  async function onImportFile(importFiles) {
    if (importFiles) {
      const root = await fileSystem.getRoot();
      const desktop = (await root.getNodeByName("デスクトップ")).asFolder();
      const file = await fileSystem.createFile();
      file.write(await importFiles[0].text());
      await desktop.link("imported file", file.id)
    }
  }

  async function onUndumpCounter() {
    undumpCounter++;
    if (undumpCounter == 5) {
      $loading = true;
      for (const file of dumpFiles) {
        const s = await readFileAsText(file);
        await (fileSystem as IndexedDBFileSystem).undump(s);
      }
      console.log("undump done");
      $loading = false;
      dumpFiles = null;
    }
  }

  function readFileAsText(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  function refreshFilms(book: Book) {
    // book内のfilmをすべてpublishする
    const films = collectAllFilms(book);
    for (const film of films) {
      effectProcessorQueue.publish(film);
    }
  }

  onMount(async () => {
    root = await fileSystem.getRoot();
    desktop = await root.getEmbodiedEntryByName("デスクトップ");
    cabinet = await root.getEmbodiedEntryByName("キャビネット");
    trash = await root.getEmbodiedEntryByName("ごみ箱");
    // const templates = await root.getEmbodiedEntryByName("テンプレート");
  });
</script>

<div class="drawer-outer">
  <Drawer
    open={$fileManagerOpen}
    placement="left"
    size="640px"
    on:clickAway={() => ($fileManagerOpen = false)}
  >
    <div class="drawer-content">
      <h2>ローカル</h2>
      <div class="cabinet variant-ghost-tertiary rounded-container-token">
        {#if desktop && trash}
          <FileManagerFolder fileSystem={fileSystem} removability={"unremovable"} spawnability={"file-spawnable"} filename={"デスクトップ"} bindId={desktop[0]} parent={root} index={0} path={[desktop[0]]} trash={trash[2].asFolder()}/>
        {/if}
      </div>
      <div class="cabinet variant-ghost-tertiary rounded-container-token">
        {#if cabinet && trash}
          <FileManagerFolder fileSystem={fileSystem} removability={"unremovable"} spawnability={"folder-spawnable"} filename={"キャビネット"} bindId={cabinet[0]} parent={root} index={0} path={[cabinet[0]]} trash={trash[2].asFolder()}/>
        {/if}
      </div>
      <div class="cabinet variant-ghost-secondary rounded-container-token">
        {#if trash}
          <FileManagerFolder fileSystem={fileSystem} removability={"unremovable"} spawnability={"unspawnable"} filename={"ごみ箱"} bindId={trash[0]} parent={root} index={1} path={[trash[0]]} trash={null}/>
        {/if}
      </div>
      <div class="flex flex-row gap-2 items-center justify-center">
        <p>ファイルシステム使用量: {usedSize}</p>
        <button class="btn-sm w-32 variant-filled" on:click={displayStoredImages}>画像一覧</button>
      </div>
      <div class="flex flex-row gap-2 items-center justify-center">
        <button class="btn-sm w-32 variant-filled" on:click={dumpFileSystem}>ダンプ</button>
        <div class="hbox gap mx-2" style="margin-top: 8px;">
          リストア<input accept="application/json" bind:files={dumpFiles} id="dump" name="dump" type="file" />
        </div>
        {#if dumpFiles}
          <button class="btn-sm w-8 variant-filled" on:click={onUndumpCounter} use:toolTip={"5で実行"}>{undumpCounter}</button>
        {/if}
      </div>
<!--
      {#if cloudCabinet && cloudTrash}
        <h2>クラウド</h2>
        <div class="notice">この機能はβ版です。断りなくサービス停止する可能性があります。</div>
        <div class="cabinet variant-ghost-primary rounded-container-token">
          <FileManagerFolder fileSystem={cloudFileSystem} removability={"unremovable"} spawnability={"unspawnable"} filename={"クラウドキャビネット"} bindId={cloudCabinet[0]} parent={cloudRoot} index={0} path={[cloudCabinet[0]]} trash={cloudTrash[2].asFolder()}/>
        </div>
        <div class="cabinet variant-ghost-primary rounded-container-token">
          <FileManagerFolder fileSystem={cloudFileSystem} removability={"unremovable"} spawnability={"unspawnable"} filename={"クラウドごみ箱"} bindId={cloudTrash[0]} parent={cloudRoot} index={1} path={[cloudTrash[0]]} trash={null}/>
        </div>
      {/if}
-->            
    </div>
  </Drawer>
</div>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    margin-top: 16px;
    margin-left: 8px;
  }
</style>
