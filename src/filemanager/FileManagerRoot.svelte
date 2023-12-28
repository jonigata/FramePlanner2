<script lang="ts">
  import { onMount } from 'svelte';
  import { fileManagerOpen, fileManagerRefreshKey, saveBookTo, loadBookFrom, getCurrentDateTime, newBookToken, newBubbleToken, newFile, filenameDisplayMode, saveBubbleTo, shareBookToken } from "./fileManagerStore";
  import type { FileSystem, NodeId } from '../lib/filesystem/fileSystem';
  import type { Page, Book } from '../bookeditor/book';
  import { newBook, revisionEqual, commitBook } from '../bookeditor/book';
  import { mainBook, mainPage } from '../bookeditor/bookStore';
  import type { Revision } from "../bookeditor/book";
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { recordCurrentFileId, fetchCurrentFileId } from './currentFile';
  import { modalStore } from '@skeletonlabs/skeleton';
  import type { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import { buildFileSystem as buildShareFileSystem } from './shareFileSystem';
  import type { FirebaseFileSystem } from '../lib/filesystem/firebaseFileSystem';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { getAnalytics, logEvent } from "firebase/analytics";
  import { getLayover } from "../firebase";
  import { createPage } from '../weaver/weaverStore';
  import Drawer from '../utils/Drawer.svelte'
  import FileManagerFolder from './FileManagerFolder.svelte';

  export let fileSystem: FileSystem;

  // TODO: ヒストリの最後にタグがついてるときは少し待つ

  let root = null;
  let desktop = null;
  let cabinet = null;
  let trash = null;
  // let templates: [BindId, string, Node] = null;
  let currentRevision: Revision = null;

  $:onUpdateBook($mainBook);
  async function onUpdateBook(book: Book) {
    console.log("onUpdateBook");
    if (book == null) {
      modalStore.trigger({ type: 'component',component: 'waiting' });    

      const currentFileId = (await fetchCurrentFileId()) as NodeId;
      let currentFile = currentFileId ? await fileSystem.getNode(currentFileId) : null; // 存在しない場合null

      const sharedBook = await loadSharedBook();
      if (sharedBook) {
        currentFile = null;
        book = sharedBook;
      }

      if (currentFile) {
        const newBook = await loadBookFrom(fileSystem, currentFile.asFile());
        currentRevision = {...newBook.revision};
        $mainBook = newBook;
      } else {
        // 初起動の場合、またはsharedPageを読んでいる場合はデスクトップにセーブ
        const root = await fileSystem.getRoot();
        const desktop = await root.getNodeByName("デスクトップ");
        book = newBook('not visited', sharedBook ? "shared-" : "initial-", 0);
        await newFile(fileSystem, desktop.asFolder(), getCurrentDateTime(), book);

        currentRevision = {...book.revision};
        $mainBook = book;
        $fileManagerRefreshKey++;
        await recordCurrentFileId(book.revision.id);
        logEvent(getAnalytics(), 'new_page');
      }

      modalStore.close();
    } else {
      if (revisionEqual(book.revision, currentRevision)) {
        return;
      }

      // 普通のオートセーブ
      const file = await fileSystem.getNode(book.revision.id as NodeId);
      await saveBookTo(book, fileSystem, file.asFile());
      currentRevision = {...book.revision};
      await recordCurrentFileId(book.revision.id as NodeId);
    }
  }

  async function loadSharedBook(): Promise<Book> {
    const urlParams = new URLSearchParams(window.location.search);
    console.log("URLParams", urlParams);
    if (urlParams.has('user') && urlParams.get('key')) {
      const user = urlParams.get('user');
      const key = urlParams.get('key');
      console.log("user:key = ", user, key);

      const fileSystem = (await buildShareFileSystem(user)) as FirebaseFileSystem;
      const file = await fileSystem.getNode(key as NodeId);
      const book = await loadBookFrom(fileSystem, file.asFile());
      return book;
    }
    if (urlParams.has('build')) {
      logEvent(getAnalytics(), 'gpt-build');
      const build = urlParams.get('build');
      const storyboard = await getLayover(build);

      console.log(storyboard.pages[0]);
      const page = createPage(storyboard.pages[0], '');

      const book: Book = {
        revision: { id: 'gpt-build', revision:1, prefix: 'gpt-build-' },
        pages: [page],
        history: { entries: [], cursor: 0 },
      }
      commitBook(book, null);
      return book;
    }
    return null;
  }

/* BookEditor行きか？
  $:onNewFileRequest($newFileToken);
  async function onNewFileRequest(page: Page) {
    if (page) {
      console.log("onNewFileRequest", page);
      $newFileToken = null;
      const root = await fileSystem.getRoot();
      const desktop = await root.getNodeByName("デスクトップ");
      await newFile(fileSystem, desktop.asFolder(), getCurrentDateTime(), page);
      currentRevision = {...page.revision};
      $mainPage = page;

      $fileManagerRefreshKey++;
    }
  }
*/

  $:onNewBookRequest($newBookToken);
  async function onNewBookRequest(book: Book) {
    if (book) {
      console.tag("new book request", "green");
      $newBookToken = null;
      const root = await fileSystem.getRoot();
      const cabinet = await root.getNodeByName("キャビネット");
      await newFile(fileSystem, cabinet.asFolder(), getCurrentDateTime(), book);
      currentRevision = {...book.revision};
      $mainBook = book;
      $fileManagerRefreshKey++;
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
    modalStore.trigger({ type: 'component',component: 'waiting' });    

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

    modalStore.close();
    toastStore.trigger({ message: 'クリップボードにシェアURLをコピーしました', timeout: 1500});
  }

  onMount(async () => {
    root = await fileSystem.getRoot();
    desktop = await root.getEntryByName("デスクトップ");
    cabinet = await root.getEntryByName("キャビネット");
    trash = await root.getEntryByName("ごみ箱");
    // templates = await root.getEntryByName("テンプレート");
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
        <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
          <RadioItem bind:group={$filenameDisplayMode} name="filenameDisplayMode" value={'filename'}>ファイル名</RadioItem>
          <RadioItem bind:group={$filenameDisplayMode} name="filenameDisplayMode" value={'index'}>ページ番号</RadioItem>
        </RadioGroup>
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
  }
  .cabinet {
    margin: 8px;
    padding: 8px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>
