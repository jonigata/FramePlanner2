<script lang="ts">
  import { onMount } from 'svelte';
  import streamSaver from 'streamsaver';
  import { _ } from 'svelte-i18n';
  import { fileManagerUsedSizeToken, fileManagerOpen, saveBookTo, loadBookFrom, getCurrentDateTime, newBookToken, saveBubbleToken, newFile, fileManagerMarkedFlag, saveBubbleTo, loadToken, type LoadToken, mainBookFileSystem, gadgetFileSystem, clearSelection } from "./fileManagerStore";
  import type { FileSystem, NodeId, Folder, EmbodiedEntry } from '../lib/filesystem/fileSystem';
  import { type Book } from '../lib/book/book';
  import { newBook, revisionEqual, getHistoryWeight, collectAllFilms } from '../lib/book/book';
  import { bookOperators, mainBook, mainBookTitle, redrawToken, mainBookExceptionHandler } from '../bookeditor/workspaceStore';
  import type { Revision } from "../lib/book/book";
  import { recordCurrentFileInfo, fetchCurrentFileInfo, type CurrentFileInfo, clearCurrentFileInfo } from './currentFile';
  import { readEnvelope } from '../lib/book/envelope';
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import type { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import { buildCloudFileSystem } from './shareFileSystem';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { analyticsEvent } from "../utils/analyticsEvent";
  import Drawer from '../utils/Drawer.svelte'
  import FileManagerFolder from './FileManagerFolder.svelte';
  import { loading, progress } from '../utils/loadingStore'
  import { frameInspectorTarget } from '../bookeditor/frameinspector/frameInspectorStore';
  import { saveProhibitFlag } from '../utils/developmentFlagStore';
  import { filmProcessorQueue } from '../utils/filmprocessor/filmProcessorStore';
  import { onlineStatus, onlineAccount, type OnlineAccount, type OnlineStatus } from '../utils/accountStore';
  import { waitForChange } from '../utils/reactUtil';
  import { type Writable, writable } from 'svelte/store';
  import { waitDialog } from "../utils/waitDialog";
  import { createPreference, type FileSystemPreference, type GadgetStorePreference } from '../preferences';
  import { buildFileSystem as buildLocalFileSystem } from './localFileSystem';
  import { RadioGroup, RadioItem, Accordion, AccordionItem } from '@skeletonlabs/skeleton';
  import { createCoalescingWork } from '../utils/coalescingWork';
  import { saveStatusStore } from './saveStatusStore';

  export let localFileSystem: FileSystem;

  type RootFolders = {
    root: Folder;
    desktop: EmbodiedEntry;
    cabinet: EmbodiedEntry;
    trash: EmbodiedEntry;
  }

  type StorageState = 'uncertain' | 'linked' | 'unlinked';

  let localFolders: RootFolders;
  let localState: Writable<StorageState> = writable('uncertain'); // waitForChangeで使うのでWritable

  let cloudFileSystem: FileSystem;
  let cloudFolders: RootFolders;
  let cloudState: Writable<StorageState> = writable('uncertain'); // waitForChangeで使うのでWritable

  let fsaFileSystem: FileSystem;
  let fsaFolders: RootFolders;
  let fsaState: Writable<StorageState> = writable('uncertain'); // waitForChangeで使うのでWritable

  let usedSize: string;

  let fsaapi = 'showOpenFilePicker' in window;
  let storageFolder: FileSystemDirectoryHandle | null = null;
  $: storageFolderName = (storageFolder as FileSystemDirectoryHandle | null)?.name;

  let gadgetStorage: 'local' | 'fsa' | null = null;
  $: onGadgetStorageChanged(gadgetStorage);
  async function onGadgetStorageChanged(gs: 'local' | 'fsa' | null) {
    console.log("gadgetStorage changed", gs);
    if (gs == null) { return; }
    if (gs === 'fsa') {
      if (fsaFileSystem) {
        $gadgetFileSystem = fsaFileSystem;
      } else {
        console.warn("fsaFileSystem is lost");
        $gadgetFileSystem = localFileSystem;
        gs = 'local'; // ここでfsaFileSystemがない場合はlocalに戻す
      }
    } else {
      $gadgetFileSystem = localFileSystem;
    }
    const pref = createPreference<GadgetStorePreference | null>("gadgetStore", "current");
    await pref.set({ store: gs });
  }


  async function getRootFolders(fs: FileSystem): Promise<RootFolders> {
    const root = await fs.getRoot();
    if (root == null) {
      throw new Error(`Failed to get root folder of filesystem: ${fs.getFileSystemName()}`);
    }
    const desktop = (await root.getEmbodiedEntryByName("デスクトップ"))!;
    const cabinet = (await root.getEmbodiedEntryByName("キャビネット"))!;
    const trash = (await root.getEmbodiedEntryByName("ごみ箱"))!;
    return { root, desktop, cabinet, trash };
  }

  function getFileSystemType(id: string): 'local' | 'cloud' | 'fsa' {
    if (id === localFileSystem.id) {return 'local';}
    if (id === cloudFileSystem?.id) {return 'cloud';}
    if (id === fsaFileSystem?.id) {return 'fsa';}
    return 'local';
  }  
  
  function getFileSystemByType(type: 'local' | 'cloud' | 'fsa'): FileSystem {
    if (type === 'fsa') { return fsaFileSystem; }
    if (type === 'cloud') { return cloudFileSystem; }
    return localFileSystem;
  }

  function getFileSystemName(id: string) {
    switch (getFileSystemType(id)) {
      case 'cloud':
        return $_('storage.cloudStorage');
      case 'fsa':
        return $_('storage.localStorage');
      case 'local':
        return $_('storage.browserStorage');
    }
  }

  $: onBuildCloudFileSystem($onlineStatus, $onlineAccount);
  async function onBuildCloudFileSystem(os: OnlineStatus, oa: OnlineAccount | null) {
    console.log("#### onBuildCloudFileSystem");
    if (os == 'unknown') { $cloudState = 'uncertain'; return; }
    if (os == 'signed-out') { $cloudState = 'unlinked'; return; }

    if (oa == null) { $cloudState = 'uncertain'; return; }
    const plan = oa.subscriptionPlan;
    if (plan != 'basic' && plan != 'basic/en' && plan != 'premium') { $cloudState = 'unlinked'; return; }

    try {
      cloudFileSystem = await buildCloudFileSystem();
      cloudFolders = await getRootFolders(cloudFileSystem);
      $cloudState = 'linked';
    } catch (e) {
      console.error("Failed to build cloud file system:", e);
      $cloudState = 'unlinked';
    }
  }

  async function buildFsaFileSystem(pref: FileSystemPreference | null) {
    if (!pref) { $fsaState = 'unlinked'; return; } 
    try {
      fsaFileSystem = await buildLocalFileSystem(pref.handle);
      fsaFolders = await getRootFolders(fsaFileSystem);
      storageFolder = pref.handle;
      $fsaState = 'linked';
    }
    catch(e) {
      console.error(e);
      $fsaState = 'unlinked';
    }
  }

  const coalescingSaveWork = createCoalescingWork(
    async () => {
      // await new Promise(resolve => setTimeout(resolve, 2000));
      saveStatusStore.set('saving');

      const book = $mainBook!;
      const fs = $mainBookFileSystem!;
      if (!$saveProhibitFlag) {
        console.log("auto saving", book.revision);
        const file = (await fs.getNode(book.revision.id as NodeId))!.asFile()!;
        await saveBookTo(book, fs, file);
      }
      currentRevision = {...book.revision};
      const info: CurrentFileInfo = {
        id: book.revision.id as NodeId,
        fileSystem: getFileSystemType(fs.id),
        title: $mainBookTitle
      }
      await recordCurrentFileInfo(info);

      saveStatusStore.set('success');
    },
    (e) => {
        console.error(e);
        saveStatusStore.set('error');
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          toastStore.trigger({ message: $_('messages.memoryInsufficient'), autohide: false });
        }
    }
  )


  let currentRevision: Revision;

  $: onOpen($fileManagerOpen);
  async function onOpen(open: boolean) {
    if (open) {
      $fileManagerMarkedFlag = $bookOperators!.getMarks().some((m) => m);
      $fileManagerUsedSizeToken = localFileSystem;
    }
  }

  $: onUsedSizeUpdate($fileManagerUsedSizeToken);
  function onUsedSizeUpdate(fs: FileSystem | null) {
    // TODO: filesystemsizeなんか怪しい
    if (fs && fs === localFileSystem) {
      fs.collectTotalSize()
        .then((size) => {
          usedSize = formatMillions(size);
        })
        .catch((e) => {
          console.warn('collectTotalSize failed', e);
        });
    }
  }

  $:onUpdateBook($mainBook);
  async function onUpdateBook(book: Book | null) {
    if (book == null) {
      // initialize
      console.log("book initialize:1");
      try {
        $loading = true;

        // TODO: sharedBookオフ中
        if (await loadSharedBook()) {
          // shared bookがある場合、内部でリダイレクトする
          return;
        }

        console.log("book initialize:2");
        const currentFileInfo = await fetchCurrentFileInfo();
        if (currentFileInfo) {
          if (currentFileInfo.fileSystem === 'cloud') {
            // 現状ここは使われないはず(クラウドファイルの直接編集ができないので)
            toastStore.trigger({ message: $_('fileManager.lastAccessFileIsCloud'), timeout: 3000});
            await waitForChange(cloudState, s => s != 'uncertain');
            if ($cloudState === 'unlinked') {
              // TODO: リロードしちゃうので無意味
              toastStore.trigger({ message: $_('fileManager.cloudConnectionFailed'), timeout: 3000});
            }
            toastStore.trigger({ message: $_('fileManager.cloudFileLoadingMessage'), timeout: 3000});
          }
          if (currentFileInfo.fileSystem === 'fsa') {
            await waitForChange(fsaState, s => s!= 'uncertain');
            if ($fsaState === 'unlinked') {
              // TODO: リロードしちゃうので無意味
              toastStore.trigger({ message: $_('fileManager.localStorageConnectionFailed'), timeout: 3000 });
            }
          }
          try {
            console.log("book initialize:3");
            const fs = getFileSystemByType(currentFileInfo.fileSystem);
            console.log("book initialize:4");
            let currentFile = (await fs.getNode(currentFileInfo.id))!.asFile()!;
            console.log("book initialize:5");
            const newBook = await loadBookFrom(fs, currentFile);
            console.log("book initialize:6");
            refreshFilms(newBook);
            currentRevision = {...newBook.revision};
            console.log("book initialize:7");
            $mainBookFileSystem = fs;
            console.log("book initialize:8");
            $mainBookExceptionHandler = loadExceptionHandler; // onChangeBookが一回実行されると消去される
            console.log("book initialize:9");
            $mainBook = newBook;
            console.log("book initialize:10");
            $mainBookTitle = currentFileInfo.title ?? '';
            console.log("book initialize:11");
            $frameInspectorTarget = null;
            console.log("book initialize:12");
            analyticsEvent('continue_book');
          }
          catch (e) {
            console.error(e);
            await clearCurrentFileInfo();
            location.reload();
          }
          return;
        }

        // 初起動またはFSA/クラウドストレージ接続失敗の場合デスクトップにセーブ
        book = newBook('not visited', "initial-", "standard", null);
        // localFoldersが初期化されてない可能性があるので自力
        const root = await localFileSystem.getRoot();
        const desktop = (await root.getEmbodiedEntryByName("デスクトップ"))![2].asFolder()!;
        const title = getCurrentDateTime();
        await newFile(localFileSystem, desktop, title, book);
        await recordCurrentFileInfo({ id: book.revision.id as NodeId, fileSystem: 'local', title });

        currentRevision = {...book.revision};
        $mainBookFileSystem = localFileSystem;
        $mainBook = book;
        $mainBookTitle = title;
        analyticsEvent('new_book');
      }
      finally {
        $loading = false;
      }
    } else {
      // edited
      if (revisionEqual(book.revision, currentRevision)) {
        return;
      }

      console.log("book changed", book.revision, currentRevision, getHistoryWeight(book));
      coalescingSaveWork.request();
    }
  }

  async function loadSharedBook(): Promise<boolean> {

    console.log(localFileSystem);
    const localRoot = await localFileSystem.getRoot();
    const localDesktop = (await localRoot.getNodeByName("デスクトップ"))!.asFolder()!;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('envelope')) {
      // https://example.com/?envelope=https://api004.backblazeb2.com/file/FramePlannerPublished/published/01K6VQTM3RKA13400ZH196TBCM.envelope
      const envelopeUrl = urlParams.get('envelope')!;

      try {
        $loading = true;
        $progress = 0;

        // URLからenvelopeファイルを取得
        const response = await fetch(envelopeUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch envelope: ${response.statusText}`);
        }
        const blob = await response.blob();
        const file = new File([blob], 'shared.envelope');

        // envelopeを読み込んでbookに変換
        const book = await readEnvelope(file, n => $progress = n);

        // 新しいファイルを作成してlocalFileSystemに保存
        const newFile = await localFileSystem.createFile();
        book.revision.id = newFile.id;
        $progress = null;

        await saveBookTo(book, localFileSystem, newFile);

        // デスクトップにリンク
        const title = getCurrentDateTime();
        await localDesktop.link(title, newFile.id);

        // currentFileInfoに記録
        await recordCurrentFileInfo({ id: book.revision.id as NodeId, fileSystem: 'local', title });

        // mainBookに代入
        currentRevision = {...book.revision};
        $mainBookFileSystem = localFileSystem;
        $mainBook = book;
        $mainBookTitle = title;
        $frameInspectorTarget = null;

        toastStore.trigger({ message: $_('fileManager.sharedBookLoaded'), timeout: 2000});
        analyticsEvent('load_shared_book');
      }
      catch (error) {
        console.error('共有bookの読み込み中にエラーが発生しました:', error);
        toastStore.trigger({ message: $_('fileManager.sharedBookLoadFailed'), timeout: 3000});
        await clearCurrentFileInfo();
      }
      finally {
        $progress = null;
        $loading = false;
      }
      return true;
    } else if (urlParams.has('reset')) {
      // https://api004.backblazeb2.com/file/FramePlannerPublished/published/01K6VQTM3RKA13400ZH196TBCM.envelope
      await clearCurrentFileInfo();

      let currentUrl = new URL(window.location.href);
      let urlWithoutQuery = currentUrl.origin + currentUrl.pathname;

      window.history.replaceState(null, '', urlWithoutQuery);
      window.location.href = urlWithoutQuery;
      return true;
    } else {
      return false;
    }
  }

  $:onNewBookRequest($newBookToken);
  async function onNewBookRequest(book: Book | null) {
    if (book) {
      console.tag("new book request", "green");
      $newBookToken = null;
      await coalescingSaveWork.whenIdle();
      const desktop = localFolders.desktop[2].asFolder()!;
      const title = getCurrentDateTime();
      const { file } = await newFile(localFileSystem, desktop, title, book);
      await recordCurrentFileInfo({id: file.id as NodeId, fileSystem: 'local', title});
      currentRevision = {...book.revision};
      $mainBookFileSystem = localFileSystem;
      $mainBook = book;
      $mainBookTitle = title;
      $frameInspectorTarget = null;
      analyticsEvent('new_book');
      toastStore.trigger({ message: $_('fileManager.newFileCreated'), timeout: 1500});
    }
  }

  $:onNewBubbleRequest($saveBubbleToken);
  async function onNewBubbleRequest(bubble: Bubble | null) {
    if (!bubble) { return; }
    console.log("onNewBubbleRequest");
    $saveBubbleToken = null;
    const root = await $gadgetFileSystem!.getRoot();
    const folder = (await root!.getNodeByName("テンプレート"))!.asFolder()!;
    const file = await $gadgetFileSystem!.createFile();
    bubble.displayName= "ふきだし";
    await saveBubbleTo(bubble, file);
    await folder.link(getCurrentDateTime(), file.id);
    toastStore.trigger({ message: $_('fileManager.registeredBubbleTemplate'), timeout: 1500});
  }

  $:onLoadRequest($loadToken);
  async function onLoadRequest(lt: LoadToken | null) {
    if (!lt) { return; }
    $loadToken = null;
    await coalescingSaveWork.whenIdle();

    $loading = true;
    const fsType = getFileSystemType(lt.fileSystem.id);
    if (fsType == 'cloud') {
      toastStore.trigger({ message: $_('fileManager.cloudFileLoadingMessage'), timeout: 3000});
    }
    const file = (await lt.fileSystem.getNode(lt.nodeId))!.asFile()!;
    const book = await loadBookFrom(lt.fileSystem, file);
    const title = (await lt.parent.getEmbodiedEntry(lt.bindId))![1]
    console.log(title);
    refreshFilms(book);
    currentRevision = {...book.revision};
    $mainBookFileSystem = lt.fileSystem;
    $mainBookExceptionHandler = loadExceptionHandler; // onChangeBookが一回実行されると消去される
    $mainBook = book;
    $mainBookTitle = title;
    await recordCurrentFileInfo({id: book.revision.id as NodeId, fileSystem: getFileSystemType(lt.fileSystem.id), title});
    $frameInspectorTarget = null;
    $loading = false;
    // NOTICE:
    // このredrawは若干まじない気味 原因を特定できていない
    // 並列で行われている画像のロードがただちに終わったとき画像が描画されない
    // 一定以上時間がかかるときは不要なようなので、短いときだけケア
    setTimeout(() => {$redrawToken = true;}, 200);
  }

  async function loadExceptionHandler(e: any) {
    console.log("exception handler");
    console.error(e);
    await clearCurrentFileInfo();
    toastStore.trigger({ message: $_('fileManager.fileLoadFailed'), timeout: 1500});
    setTimeout(() => {
      location.reload();
    }, 1500);
  }

  async function displayStoredImages() {
    const d: ModalSettings = {
      type: 'component',
      component: 'fileBrowser',
    };
    modalStore.trigger(d);    
  }

  function formatMillions(n: number) {
    return (n / 1000000000).toFixed(2) + 'GB';
  }

  async function dump(fs: FileSystem) {
    console.log("dump");
    const r = await waitDialog<boolean>('dump', {sourceTitle: getFileSystemName(fs.id)});
    if (r) {
      // 新インターフェイス: optionsオブジェクトでonProgressを渡す
      const stream = await fs.dump({
        onProgress: n => $progress = n
      });

      // 例: streamSaver で保存する場合
      const fileStream = streamSaver.createWriteStream('filesystem-dump.ndjson');
      await stream.pipeTo(fileStream);

      // １秒待つ
      await new Promise(resolve => setTimeout(resolve, 1000));
      $progress = null;

      console.log("dumped");
    } else {
      console.log("canceled");
    }
  }

  async function undump(fs: FileSystem) {
    console.log("undump");
    const dumpFiles = await waitDialog<FileList>('undump', {sourceTitle: getFileSystemName(fs.id)});
    if (dumpFiles) {
      console.log("undump start");

      // File から ReadableStream を取得し options で onProgress を渡す
      await fs.undump(
        dumpFiles[0].stream(),
        {
          onProgress: (n) => {
            requestAnimationFrame(() => {
              $progress = n;
            });
          }
        }
      );
      await clearCurrentFileInfo();
      console.log("undump done");
      location.reload();
    } else {
      console.log("undump canceled");
    }
  }

  function refreshFilms(book: Book) {
    // book内のfilmをすべてpublishする
    const films = collectAllFilms(book);
    for (const film of films) {
      filmProcessorQueue.publish({ film });
    }
  }

  async function selectStorageDirectory() {
    const r = await waitDialog<boolean>('newStorageWizard');
    if (r) {
      const pref = createPreference<FileSystemPreference | null>("filesystem", "current");
      let fileSystemPreference = await pref.getOrDefault(null);

      fsaFileSystem = await buildLocalFileSystem(fileSystemPreference!.handle);
      fsaFolders = await getRootFolders(fsaFileSystem);
      storageFolder = fileSystemPreference!.handle;
      $fsaState = 'linked';
    }
  }

  async function unlinkStorageDirectory() {
    const r = await waitDialog<boolean>('confirm', { 
      title: $_('storage.unlinkStorageConfirm'),
      message: $_('storage.unlinkStorageMessage'),
      positiveButtonText: $_('storage.unlinkButton'),
      negativeButtonText: $_('storage.notUnlinkButton'),
    });
    if (!r) { return; }

    const pref = createPreference<FileSystemPreference | null>("filesystem", "current");
    pref.set(null);
    $fsaState = 'unlinked';
  }

  onMount(async () => {
    console.log("###### FileManagerRoot.onMount");
    localFolders = await getRootFolders(localFileSystem);
    localState.set('linked');

    const pref = createPreference<FileSystemPreference | null>("filesystem", "current");
    let fileSystemPreference = await pref.getOrDefault(null);
    console.log("###### fileSystemPreference", fileSystemPreference);
    // fileSystemPreference = null;
    await buildFsaFileSystem(fileSystemPreference);

    const pref2 = createPreference<GadgetStorePreference | null>("gadgetStore", "current");
    const gadgetStore = await pref2.getOrDefault(null);
    gadgetStorage = gadgetStore?.store ?? 'local';
    console.log("###### gadgetStorage", gadgetStore);
  });

</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && $fileManagerOpen) clearSelection(); }} />

<div class="drawer-outer">
  <Drawer
    open={$fileManagerOpen}
    placement="left"
    size="540px"
    on:clickAway={() => ($fileManagerOpen = false)}
  >
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="drawer-content" on:click|self={clearSelection}>
      <h2>{$_('storage.browserStorage')}</h2>
      <Accordion class="my-2 px-4">
        <AccordionItem>
          <svelte:fragment slot="summary">
            <div class="warning-summary">
              <svg xmlns="http://www.w3.org/2000/svg" class="warning-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span class="caution">
                {$_('messages.browserStorageImportantNotice')}
              </span>
            </div>
          </svelte:fragment>
          <div slot="content" class="mt-2 space-y-3">
            {#each $_('messages.dataLossWarning').split(/\n\s*\n|\r\n\s*\r\n/) as paragraph}
              <p>{paragraph}</p>
            {/each}
          </div>
        </AccordionItem>
      </Accordion>
      <div class="cabinet variant-ghost-tertiary rounded-container-token">
        {#if $localState == 'linked'}
          <FileManagerFolder
            fileSystem={localFileSystem} 
            removability={"unremovable"} 
            spawnability={"file-spawnable"} 
            filename={$_('storage.desktop')} 
            bindId={localFolders.desktop[0]} 
            parent={localFolders.root} 
            index={0} 
            path={[localFolders.desktop[0]]} 
            trash={localFolders.trash[2].asFolder()}
          />
        {/if}
      </div>
      <div class="cabinet variant-ghost-tertiary rounded-container-token">
        {#if $localState == 'linked'}
          <FileManagerFolder 
            fileSystem={localFileSystem} 
            removability={"unremovable"} 
            spawnability={"folder-spawnable"} 
            filename={$_('storage.cabinet')} 
            bindId={localFolders.cabinet[0]} 
            parent={localFolders.root} 
            index={0} 
            path={[localFolders.cabinet[0]]} 
            trash={localFolders.trash[2].asFolder()}
          />
        {/if}
      </div>
      <div class="cabinet variant-ghost-secondary rounded-container-token">
        {#if $localState == 'linked'}
          <FileManagerFolder 
            fileSystem={localFileSystem} 
            removability={"unremovable"} 
            spawnability={"unspawnable"} 
            filename={$_('storage.trash')} 
            bindId={localFolders.trash[0]} 
            parent={localFolders.root} 
            index={1} 
            path={[localFolders.trash[0]]} 
            trash={null}
          />
        {/if}
      </div>
      <div class="flex flex-row gap-2 items-center justify-center">
        <p>{$_('storage.fileSystemUsage')}: {usedSize ?? $_('storage.calculating')}</p>
        <button class="btn-sm w-32 variant-filled" on:click={displayStoredImages}>{$_('storage.imageList')}</button>
      </div>
      <div class="flex flex-row gap-2 items-center justify-center p-2">
        <button class="btn-sm w-32 variant-filled"  on:click={() => dump(localFileSystem)}>{$_('storage.dump')}</button>
        <button class="btn-sm w-32 variant-filled"  on:click={() => undump(localFileSystem)}>{$_('storage.restore')}</button>
      </div>
      <h2>{$_('storage.localStorage')}</h2>
      <p>{$_('storage.localStorageDescription')}</p>
      {#if $fsaState == 'unlinked'}
        <h3>{$_('storage.saveFolder')}</h3>
        <p>
          {$_('storage.selectFolderDescription')}
        </p>
        <div class="flex flex-row ml-8 items-center gap-4">
          <button class="btn-sm w-48 variant-filled" on:click={selectStorageDirectory} disabled={!fsaapi}>
            {$_('storage.selectSaveFolder')}
          </button>
          {#if !fsaapi}
            <div>
              {$_('messages.localStorageNotAvailable')}
            </div>  
          {/if}
        </div>
      {:else if $fsaState == 'linked'}
        <div class="cabinet variant-ghost-tertiary rounded-container-token">
          <FileManagerFolder
            fileSystem={fsaFileSystem} 
            removability={"unremovable"} 
            spawnability={"folder-spawnable"} 
            filename={`${storageFolderName}${$_('storage.cabinet')}`} 
            bindId={fsaFolders.cabinet[0]} 
            parent={fsaFolders.root} 
            index={0} 
            path={[fsaFolders.cabinet[0]]} 
            trash={fsaFolders.trash[2].asFolder()}
          />
        </div>
        <div class="cabinet variant-ghost-tertiary rounded-container-token">
          <FileManagerFolder
            fileSystem={fsaFileSystem} 
            removability={"unremovable"} 
            spawnability={"unspawnable"} 
            filename={`${storageFolderName}${$_('storage.trash')}`} 
            bindId={fsaFolders.trash[0]} 
            parent={fsaFolders.root} 
            index={1} 
            path={[fsaFolders.trash[0]]} 
            trash={null}
          />
        </div>
        <div class="flex flex-row ml-8 items-center gap-4">
          <button class="btn-sm w-48 variant-filled" on:click={unlinkStorageDirectory} disabled={!fsaapi}>
            {$_('storage.unlinkStorageDirectory')}
          </button>
        </div>
        <div class="flex flex-row gap-2 items-center justify-center p-2">
          <button class="btn-sm w-32 variant-filled"  on:click={() => dump(fsaFileSystem)}>{$_('storage.dump')}</button>
          <button class="btn-sm w-32 variant-filled"  on:click={() => undump(fsaFileSystem)}>{$_('storage.restore')}</button>
        </div>
      {:else}
        <p>
          <button class="btn-sm w-48 variant-filled">{$_('storage.unlinkStorageDirectory')}</button>
        </p>
      {/if}

      <h2>{$_('storage.cloudStorage')}</h2>
      <p>{$_('storage.cloudStorageDescription')}</p>
      {#if $cloudState == 'linked'}
        <div class="cabinet variant-ghost-primary rounded-container-token">
          <FileManagerFolder 
            fileSystem={cloudFileSystem} 
            removability={"unremovable"} 
            spawnability={"folder-spawnable"} 
            filename={$_('storage.cloudCabinet')} 
            bindId={cloudFolders.cabinet[0]} 
            parent={cloudFolders.root} 
            index={0} 
            path={[cloudFolders.cabinet[0]]} 
            trash={cloudFolders.trash[2].asFolder()}
          />
        </div>
        <div class="cabinet variant-ghost-primary rounded-container-token">
          <FileManagerFolder 
            fileSystem={cloudFileSystem} 
            removability={"unremovable"} 
            spawnability={"unspawnable"} 
            filename={$_('storage.cloudTrash')} 
            bindId={cloudFolders.trash[0]} 
            parent={cloudFolders.root} 
            index={1} 
            path={[cloudFolders.trash[0]]} 
            trash={null}
          />
        </div>
      {/if}

      {#if $fsaState == 'linked'}
        <h2>補助データの保存場所</h2>
        <p>フキダシシェイプ、素材ギャラリー、役者名簿などの保存場所を指定してください。</p>
        <div class="radio-box hbox">
          <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
            <RadioItem bind:group={gadgetStorage} name="gadget-storage" value={'local'}><span class="radio-text">ブラウザ</span></RadioItem>
            <RadioItem bind:group={gadgetStorage} name="gadget-storage" value={'fsa'}><span class="radio-text">ローカル</span></RadioItem>
          </RadioGroup>
        </div>
      {/if}

      <div class="h-24"></div>
    </div>
  </Drawer>
</div>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  p {
    font-family: '源暎アンチック';
    font-size: 14px;
    margin-left: 32px;
    margin-right: 16px;
    margin-bottom: 8px;
  }
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    margin-top: 16px;
    margin-left: 8px;
  }
  h3 {
    font-family: '源暎エムゴ';
    font-size: 20px;
    margin-left: 8px;
    margin-left: 24px;
  }
  .cabinet {
    margin-left: 12px;
    margin-right: 12px;
    margin-bottom: 12px;
  }
  .warning-summary {
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, rgba(234, 179, 8, 0.35) 0%, rgba(234, 179, 8, 0.25) 100%);
    border-left: 4px solid rgb(234, 179, 8);
    padding: 12px 16px;
    margin: -8px -12px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(234, 179, 8, 0.25);
  }
  .warning-icon {
    width: 24px;
    height: 24px;
    color: rgb(120, 53, 15);
    flex-shrink: 0;
    animation: pulse-warning 2s ease-in-out infinite;
  }
  @keyframes pulse-warning {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }
  .caution {
    font-family: '源暎アンチック';
    font-size: 16px;
    font-weight: bold;
    color: rgb(161, 98, 7);
  }
</style>
