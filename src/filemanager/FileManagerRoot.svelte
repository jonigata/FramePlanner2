<script lang="ts">
  import { onMount } from 'svelte';
  import { fileManagerUsedSize, fileManagerOpen, fileManagerRefreshKey, saveBookTo, loadBookFrom, getCurrentDateTime, newBookToken, newBubbleToken, newFile, filenameDisplayMode, saveBubbleTo, shareBookToken, loadToken } from "./fileManagerStore";
  import type { FileSystem, NodeId } from '../lib/filesystem/fileSystem';
  import type { Book } from '../bookeditor/book';
  import { newBook, revisionEqual, commitBook, getHistoryWeight } from '../bookeditor/book';
  import { mainBook } from '../bookeditor/bookStore';
  import type { Revision } from "../bookeditor/book";
  import { recordCurrentFileId, fetchCurrentFileId } from './currentFile';
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import type { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import { buildFileSystem as buildShareFileSystem } from './shareFileSystem';
  import type { FirebaseFileSystem } from '../lib/filesystem/firebaseFileSystem';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { getAnalytics, logEvent } from "firebase/analytics";
  import { getLayover } from "../firebase";
  import { createPage } from '../weaver/weaverStore';
  import Drawer from '../utils/Drawer.svelte'
  import FileManagerFolder from './FileManagerFolder.svelte';
  import { collectGarbage } from '../utils/garbageCollection';
  import { browserStrayImages, browserUsedImages } from '../utils/fileBrowserStore';
  import type { IndexedDBFileSystem } from '../lib/filesystem/indexeddbFileSystem';
  import { DelayedCommiter } from '../utils/cancelableTask';
  import { loading } from '../utils/loadingStore'
  import { toolTip } from '../utils/passiveToolTipStore';

  export let fileSystem: FileSystem;

  let root = null;
  let desktop = null;
  let cabinet = null;
  let trash = null;
  // let templates: [BindId, string, Node] = null;
  let currentRevision: Revision = null;
  let delayedCommiter = new DelayedCommiter(
    async () => {
      const book = $mainBook;
      const file = await fileSystem.getNode(book.revision.id as NodeId);
      await saveBookTo(book, fileSystem, file.asFile());
      currentRevision = {...book.revision};
      await recordCurrentFileId(book.revision.id as NodeId);
    });
  let undumpCounter = 0;

  $: onOpen($fileManagerOpen);
  async function onOpen(open: boolean) {
    if (open) {
      $fileManagerUsedSize = await fileSystem.collectTotalSize();
      console.log("used size updated");
    }
  }

  $:onUpdateBook($mainBook);
  async function onUpdateBook(book: Book) {
    if (book == null) {
      $loading = true;

      if (await loadSharedBook()) {
        // shared bookがある場合、内部でリダイレクトする
        return;
      }

      const currentFileId = (await fetchCurrentFileId()) as NodeId;
      let currentFile = currentFileId ? await fileSystem.getNode(currentFileId) : null; // 存在しない場合null

      if (currentFile) {
        const newBook = await loadBookFrom(fileSystem, currentFile.asFile());
        currentRevision = {...newBook.revision};
        console.snapshot(newBook.pages[0]);
        $mainBook = newBook;
        logEvent(getAnalytics(), 'continue_book');
      } else {
        // 初起動の場合はデスクトップにセーブ
        const root = await fileSystem.getRoot();
        const desktop = await root.getNodeByName("デスクトップ");
        book = newBook('not visited', "initial-", 0);
        await newFile(fileSystem, desktop.asFolder(), getCurrentDateTime(), book);
        await recordCurrentFileId(book.revision.id);

        currentRevision = {...book.revision};
        $mainBook = book;
        $fileManagerRefreshKey++;
        logEvent(getAnalytics(), 'new_book');
      }

      $loading = false;
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
    const root = await fileSystem.getRoot();
    const desktop = (await root.getNodeByName("デスクトップ")).asFolder();

    const urlParams = new URLSearchParams(window.location.search);
    console.log("URLParams", urlParams);
    if (urlParams.has('user') && urlParams.get('key')) {
      logEvent(getAnalytics(), 'shared');
      const user = urlParams.get('user');
      const key = urlParams.get('key');
      console.log("user:key = ", user, key);

      if (await fileSystem.getNode(key as NodeId) == null) {
        // 読んだことがなければ読み込んでローカルに保存
        console.log("shared page load from server", window.location.href);
        const remoteFileSystem = (await buildShareFileSystem(user)) as FirebaseFileSystem;
        const remoteFile = await remoteFileSystem.getNode(key as NodeId);
        const book = await loadBookFrom(remoteFileSystem, remoteFile.asFile());

        // ここでidはulidではなくfirebaseのpushで与えられるidになるが、
        // 重なることはほぼないので、そのまま使う
        const localFile = await fileSystem.createFileWithId(key as NodeId);
        await saveBookTo(book, fileSystem, localFile);
        await desktop.link("シェア " + getCurrentDateTime(), localFile.id);
      }
      await recordCurrentFileId(key as NodeId);
    } else if (urlParams.has('build')) {
      logEvent(getAnalytics(), 'gpt_build');
      const build = urlParams.get('build');
      const storyboard = await getLayover(build);

      console.log(storyboard.pages[0]);
      const page = createPage(storyboard.pages[0], '');

      const localFile = await fileSystem.createFile();
      const book: Book = {
        revision: { id: localFile.id, revision:1, prefix: 'gpt-build-' },
        pages: [page],
        history: { entries: [], cursor: 0 },
        direction: 'right-to-left',
        wrapMode: 'none',
      }
      commitBook(book, null);
      await saveBookTo(book, fileSystem, localFile);
      await desktop.link(getCurrentDateTime(), localFile.id);
      await recordCurrentFileId(localFile.id as NodeId);
    } else if (urlParams.has('reset')) {
      await recordCurrentFileId(undefined);
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
      $newBookToken = null;
      const root = await fileSystem.getRoot();
      const cabinet = await root.getNodeByName("デスクトップ");
      await newFile(fileSystem, cabinet.asFolder(), getCurrentDateTime(), book);
      currentRevision = {...book.revision};
      $mainBook = book;
      $fileManagerRefreshKey++;
      logEvent(getAnalytics(), 'new_book');
    }
  }

  $:onNewBubbleRequest($newBubbleToken);
  async function onNewBubbleRequest(bubble: Bubble) {
    if (!bubble) { return; }
    console.log("onNewBalloonRequest");
    $newBubbleToken = null;
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
    const fileSystem = (await buildShareFileSystem(null)) as FirebaseFileSystem;
    const file = await fileSystem.createFile('text');
    await saveBookTo(book, fileSystem, file);
    console.log(file.id);

    // URL作成
    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.set('user', fileSystem.userId);
    params.set('key', file.id);
    url.search = params.toString();
    const shareUrl = url.toString();
    navigator.clipboard.writeText(shareUrl);

    $loading = false;
    toastStore.trigger({ message: 'クリップボードにシェアURLをコピーしました', timeout: 1500});
  }

  $:onLoadRequest($loadToken);
  async function onLoadRequest(nodeId: NodeId) {
    if (!nodeId) { return; }
    $loadToken = null;

    $loading = true;
    const file = (await fileSystem.getNode(nodeId)).asFile();
    const book = await loadBookFrom(fileSystem, file);
    currentRevision = {...book.revision};
    $mainBook = book; // TODO: ここで無駄なセーブが走っている
    $loading = false;
  }

  async function displayStoredImages() {
    $loading = true;
    const { usedImageFiles, strayImageFiles } = await collectGarbage(fileSystem);

    const usedImages = [];
    for (const imageFile of usedImageFiles) {
      const file = await fileSystem.getNode(imageFile as NodeId);
      const image = await file.asFile().readImage();
      await image.decode();
      console.log("loaded used image", imageFile);
      usedImages.push(image);
    }

    const strayImages = [];
    for (const imageFile of strayImageFiles) {
      const file = await fileSystem.getNode(imageFile as NodeId);
      const image = await file.asFile().readImage();
      await image.decode();
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

  async function onUndumpCounter() {
    undumpCounter++;
    if (undumpCounter == 5) {
      $loading = true;
      for (const file of dumpFiles) {
        const s = await readFileAsText(file);
        await (fileSystem as IndexedDBFileSystem).undump(s);
      }
      console.log("undump done");
      $fileManagerRefreshKey++;
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
    {#key $fileManagerRefreshKey}
      <div class="drawer-content">
<!--
        {#if desktop}
          <div class="desktop">
            <div class="desktop-sheet variant-soft-primary surface rounded-container-token">
                <FileManagerDesktop fileSystem={fileSystem} node={desktop}/>
            </div>
          </div>
        {/if}
-->
        <div class="cabinet variant-ghost-tertiary rounded-container-token">
          {#if desktop}
            <FileManagerFolder fileSystem={fileSystem} removability={"unremovable"} spawnability={"file-spawnable"} filename={"デスクトップ"} bindId={desktop[0]} parent={root} index={0} path={[desktop[0]]}/>
          {/if}
        </div>
        <div class="cabinet variant-ghost-tertiary rounded-container-token">
          {#if cabinet}
            <FileManagerFolder fileSystem={fileSystem} removability={"unremovable"} spawnability={"folder-spawnable"} filename={"キャビネット"} bindId={cabinet[0]} parent={root} index={0} path={[cabinet[0]]}/>
          {/if}
        </div>
        <div class="cabinet variant-ghost-secondary rounded-container-token">
          {#if trash}
            <FileManagerFolder fileSystem={fileSystem} removability={"unremovable"} spawnability={"unspawnable"} filename={"ごみ箱"} bindId={trash[0]} parent={root} index={1} isTrash={true} path={[trash[0]]}/>
          {/if}
        </div>
<!--
        <div class="cabinet variant-ghost-secondary rounded-container-token">
          {#if templates}
            <FileManagerFolder fileSystem={fileSystem} removability={"unremovable"} spawnability={"unspawnable"} name={"テンプレート"} bindId={templates[0]} parent={root} index={2} isTrash={true} path={[templates[0]]}/>
          {/if}
        </div>
  -->
      </div>
      <div class="toolbar">
        <p>ファイルシステム使用量: {formatMillions($fileManagerUsedSize)}</p>
        <button class="btn-sm w-32 variant-filled" on:click={displayStoredImages}>画像一覧</button>
      </div> 
      <div class="toolbar">
        <button class="btn-sm w-32 variant-filled" on:click={dumpFileSystem}>ダンプ</button>
        <div class="hbox gap mx-2" style="margin-top: 8px;">
          リストア<input accept="application/json" bind:files={dumpFiles} id="dump" name="dump" type="file" />
        </div>
        {#if dumpFiles}
          <button class="btn-sm w-8 variant-filled" on:click={onUndumpCounter} use:toolTip={"5で実行"}>{undumpCounter}</button>
        {/if}
      </div>
    {/key}
  </Drawer>
</div>

<style>
  .toolbar {
    display: flex;
    justify-content: flex-start;
    flex-direction: row;
    margin: 8px;
    gap: 16px;
    height: 32px;
  }
  .cabinet {
    margin: 8px;
    padding: 8px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .button {
    width: 160px;
  }
</style>
