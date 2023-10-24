<script lang="ts">
  import Drawer from './Drawer.svelte'
  import FileManagerFolder from './FileManagerFolder.svelte';
  import { type Book, fileManagerOpen, fileManagerRefreshKey, savePageTo, loadPageFrom, getCurrentDateTime, newFileToken, newBookToken, newBubbleToken, newFile, filenameDisplayMode, saveBubbleTo, sharePageToken } from "./fileManagerStore";
  import type { FileSystem, NodeId, File } from './lib/filesystem/fileSystem';
  import { type Page, mainPage, revisionEqual, commitPage, getRevision } from './pageStore';
  import { onMount } from 'svelte';
  import type { Revision } from "./pageStore";
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { recordCurrentFileId, fetchCurrentFileId } from './currentFile';
  import { modalStore } from '@skeletonlabs/skeleton';
  import type { Bubble } from "./lib/layeredCanvas/bubble.js";
  import { buildFileSystem as buildShareFileSystem } from './shareFileSystem';
  import type { FirebaseFileSystem } from './lib/filesystem/firebaseFileSystem';
  import { toastStore } from '@skeletonlabs/skeleton';

  export let fileSystem: FileSystem;

  let root = null;
  let desktop = null;
  let cabinet = null;
  let trash = null;
  // let templates: [BindId, string, Node] = null;
  let currentRevision: Revision = null;

  $:onUpdatePage($mainPage);
  async function onUpdatePage(page: Page) {
    console.log("onUpdatePage");
    if (revisionEqual(page.revision, currentRevision)) {
      return;
    }

    if (page.revision.id === "bootstrap") { 
      modalStore.trigger({ type: 'component',component: 'waiting' });    

      const currentFileId = (await fetchCurrentFileId()) as NodeId;
      let currentFile = null;
      if (currentFileId) {
        currentFile = await fileSystem.getNode(currentFileId); // 存在しない場合null
      }

      const sharedPage = await loadSharedPage();
      if (sharedPage) {
        currentFile = null;
        page = sharedPage;
      }

      if (currentFile) {
        console.log("*********** loadPageFrom from FileManagerRoot", currentFile);
        const newPage = await loadPageFrom(fileSystem, currentFile.asFile());
        currentRevision = getRevision(newPage);
        $mainPage = newPage;
      } else {
        // 初期化時は仮ファイルをセーブする
        const root = await fileSystem.getRoot();
        const desktop = await root.getNodeByName("デスクトップ");
        const file = await fileSystem.createFile();
        console.log("*********** savePageTo from FileManagerRoot(1)", currentRevision);
        await savePageTo(page, fileSystem, file);
        await desktop.asFolder().link(getCurrentDateTime(), file.id);
        const newPage = commitPage(page, page.frameTree, page.bubbles, null);
        newPage.revision.id = file.id;
        newPage.revision.prefix = "standard";
        currentRevision = getRevision(newPage);
        $mainPage = newPage;
        $fileManagerRefreshKey++;
        await recordCurrentFileId(file.id);
      }

      modalStore.close();
    } else {
      const file = await fileSystem.getNode(page.revision.id as NodeId);
      console.log("*********** savePageTo from FileManagerRoot(2)");
      await savePageTo(page, fileSystem, file.asFile());
      currentRevision = {...page.revision};
      await recordCurrentFileId(page.revision.id as NodeId);
    }
  }

  async function loadSharedPage(): Promise<Page> {
    const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('user') && urlParams.get('key')) {
        const user = urlParams.get('user');
        const key = urlParams.get('key');
        console.log("user:key = ", user, key);

        const fileSystem = (await buildShareFileSystem(user)) as FirebaseFileSystem;
        const file = await fileSystem.getNode(key as NodeId);
        const page = await loadPageFrom(fileSystem, file.asFile());
        return page;
      }
      return null;
    }

  $:onNewFileRequest($newFileToken);
  async function onNewFileRequest(page: Page) {
    if (page) {
      console.log("onNewFileRequest");
      $newFileToken = null;
      const root = await fileSystem.getRoot();
      const desktop = await root.getNodeByName("デスクトップ");
      await newFile(fileSystem, desktop.asFolder(), getCurrentDateTime(), page);
      currentRevision = getRevision(page);
      $mainPage = page;

      $fileManagerRefreshKey++;
    }
  }

  $:onNewBookRequest($newBookToken);
  async function onNewBookRequest(book: Book) {
    if (book) {
      console.log("onNewBookRequest");
      $newBookToken = null;
      const root = await fileSystem.getRoot();
      const cabinet = await root.getNodeByName("キャビネット");

      // フォルダ
      const folder = await fileSystem.createFolder();
      await cabinet.asFolder().link(book.title, folder.id);

      // ファイル
      for (let i = 0; i < book.pages.length; i++) {
        const file = await fileSystem.createFile();
        await newFile(fileSystem, folder, getCurrentDateTime(), book.pages[i]);
      }

      currentRevision = getRevision(book.pages[0]);
      $mainPage = book.pages[0];

      $fileManagerRefreshKey++;
    }
  }

  $:onNewBubbleRequest($newBubbleToken);
  async function onNewBubbleRequest(bubble: Bubble) {
    if (bubble) {
      console.log("onNewBalloonRequest");
      $newBubbleToken = null;
      const root = await fileSystem.getRoot();
      const folder = await root.getNodeByName("テンプレート");
      const file = await fileSystem.createFile();
      await saveBubbleTo(bubble, file);
      await folder.asFolder().link(getCurrentDateTime(), file.id);
    }
  }

  $:onSharePageRequest($sharePageToken);
  async function onSharePageRequest(p: Page) {
    if (p) {
      modalStore.trigger({ type: 'component',component: 'waiting' });    

      const page = {...p};
      page.history = [];
      page.historyIndex = 0;
      console.log("onSharePageRequest");
      $sharePageToken = null;
      const fileSystem = (await buildShareFileSystem(null)) as FirebaseFileSystem;
      const file = await fileSystem.createFile('text');
      await savePageTo(page, fileSystem, file);
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
