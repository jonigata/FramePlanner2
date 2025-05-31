<script lang="ts">
  import { onMount } from 'svelte';
  import streamSaver from 'streamsaver';
  import { fileManagerUsedSizeToken, fileManagerOpen, saveBookTo, loadBookFrom, getCurrentDateTime, newBookToken, saveBubbleToken, newFile, fileManagerMarkedFlag, saveBubbleTo, loadToken, type LoadToken, mainBookFileSystem } from "./fileManagerStore";
  import type { FileSystem, NodeId, Folder, EmbodiedEntry } from '../lib/filesystem/fileSystem';
  import { type Book } from '../lib/book/book';
  import { newBook, revisionEqual, getHistoryWeight, collectAllFilms } from '../lib/book/book';
  import { bookOperators, mainBook, mainBookTitle, redrawToken, mainBookExceptionHandler } from '../bookeditor/workspaceStore';
  import type { Revision } from "../lib/book/book";
  import { recordCurrentFileInfo, fetchCurrentFileInfo, type CurrentFileInfo, clearCurrentFileInfo } from './currentFile';
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import type { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import { buildCloudFileSystem } from './shareFileSystem';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { analyticsEvent } from "../utils/analyticsEvent";
  import Drawer from '../utils/Drawer.svelte'
  import FileManagerFolder from './FileManagerFolder.svelte';
  import { DelayedCommiter } from '../utils/delayedCommiter';
  import { loading, progress } from '../utils/loadingStore'
  import { frameInspectorTarget } from '../bookeditor/frameinspector/frameInspectorStore';
  import { saveProhibitFlag } from '../utils/developmentFlagStore';
  import { filmProcessorQueue } from '../utils/filmprocessor/filmProcessorStore';
  import { onlineStatus, onlineAccount, type OnlineAccount, type OnlineStatus } from '../utils/accountStore';
  import { waitForChange } from '../utils/reactUtil';
  import { type Writable, writable } from 'svelte/store';
  import { waitDialog } from "../utils/waitDialog";
  import { createPreference, type FileSystemPreference } from '../preferences';
  import { buildFileSystem as buildLocalFileSystem } from './localFileSystem';

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

  async function getRootFolders(fs: FileSystem): Promise<RootFolders> {
    const root = await fs.getRoot();
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
        return 'クラウドストレージ';
      case 'fsa':
        return 'ローカルストレージ';
      case 'local':
        return 'ブラウザストレージ';
    }
  }

  $: onBuildCloudFileSystem($onlineStatus, $onlineAccount);
  async function onBuildCloudFileSystem(os: OnlineStatus, oa: OnlineAccount | null) { 
    if (os == 'unknown') { $cloudState = 'uncertain'; return; }
    if (os == 'signed-out') { $cloudState = 'unlinked'; return; }

    if (oa == null) { $cloudState = 'uncertain'; return; }
    const plan = oa.subscriptionPlan;
    if (plan != 'basic' && plan != 'premium') { $cloudState = 'unlinked'; return; }

    cloudFileSystem = await buildCloudFileSystem();
    cloudFolders = await getRootFolders(cloudFileSystem);
    $cloudState = 'linked';
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

  let currentRevision: Revision;
  let delayedCommiter = new DelayedCommiter(
    async () => {
      const book = $mainBook!;
      const fs = $mainBookFileSystem!;
      if (!$saveProhibitFlag) {
        const file = (await fs.getNode(book.revision.id as NodeId))!.asFile()!;
        try {
          await saveBookTo(book, fs, file);
        }
        catch (e) {
          console.error(e);
          if (e instanceof DOMException && e.name === "QuotaExceededError") {
            toastStore.trigger({ message: "記憶領域が不足しています。早めに領域を空けたのち、ダンプを取るなどの対応を行ってください。放置した場合、FramePlannerのデータがすべて消滅することがあります。", autohide: false });
          }
        }
      }
      currentRevision = {...book.revision};
      const info: CurrentFileInfo = {
        id: book.revision.id as NodeId,
        fileSystem: getFileSystemType(fs.id),
        title: $mainBookTitle
      }
      await recordCurrentFileInfo(info);
    });

  $: onOpen($fileManagerOpen);
  async function onOpen(open: boolean) {
    if (open) {
      $fileManagerMarkedFlag = $bookOperators!.getMarks().some((m) => m);
      $fileManagerUsedSizeToken = localFileSystem;
      console.log("used size updated");
    }
  }

  $: onUsedSizeUpdate($fileManagerUsedSizeToken);
  function onUsedSizeUpdate(fs: FileSystem | null) {
    // TODO: filesystemsizeなんか怪しい
    if (fs && fs === localFileSystem) {
      fs.collectTotalSize().then((size) => {
        usedSize = formatMillions(size);
      });
    }
  }

  $:onUpdateBook($mainBook);
  async function onUpdateBook(book: Book | null) {
    if (book == null) {
      // initialize
      try {
        $loading = true;

        // TODO: sharedBookオフ中
        if (await loadSharedBook()) {
          // shared bookがある場合、内部でリダイレクトする
          return;
        }

        const currentFileInfo = await fetchCurrentFileInfo();
        if (currentFileInfo) {
          if (currentFileInfo.fileSystem === 'cloud') {
            // 現状ここは使われないはず(クラウドファイルの直接編集ができないので)
            toastStore.trigger({ message: "最終アクセスファイルがクラウドファイルのため、<br/>クラウドストレージの接続を待っています", timeout: 3000});
            await waitForChange(cloudState, s => s != 'uncertain');
            if ($cloudState === 'unlinked') {
              // TODO: リロードしちゃうので無意味
              toastStore.trigger({ message: "クラウドストレージに接続できませんでした", timeout: 3000});
            }
            toastStore.trigger({ message: "クラウドファイルの読み込みには<br/>時間がかかることがあります", timeout: 3000});
          }
          if (currentFileInfo.fileSystem === 'fsa') {
            await waitForChange(fsaState, s => s!= 'uncertain');
            if ($fsaState === 'unlinked') {
              // TODO: リロードしちゃうので無意味
              toastStore.trigger({ message: "ローカル記憶領域との接続に失敗しました。再接続してください。", timeout: 3000 });
            }
          }
          try {
            const fs = getFileSystemByType(currentFileInfo.fileSystem);
            let currentFile = (await fs.getNode(currentFileInfo.id))!.asFile()!;
            const newBook = await loadBookFrom(fs, currentFile);
            refreshFilms(newBook);
            currentRevision = {...newBook.revision};
            $mainBookFileSystem = fs;
            $mainBookExceptionHandler = loadExceptionHandler; // onChangeBookが一回実行されると消去される
            $mainBook = newBook;
            $mainBookTitle = currentFileInfo.title ?? '';
            $frameInspectorTarget = null;
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
        book = newBook('not visited', "initial-", "standard");
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
    // TODO: いま使ってない
/*    
    console.log(localFileSystem);
    const localRoot = await localFileSystem.getRoot();
    const localDesktop = (await localRoot.getNodeByName("デスクトップ"))!.asFolder()!;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('box') && urlParams.get('file')) {
      analyticsEvent('shared');
      const box = urlParams.get('box')!;
      const file = urlParams.get('file')!;
      console.log("box:file = ", box, file);

      if (await localFileSystem.getNode(file as NodeId) == null) {
        // 読んだことがなければ読み込んでローカルに保存
        console.log("shared page load from server", window.location.href);
        const remoteFileSystem = await buildShareFileSystem(box);
        const remoteFile = (await remoteFileSystem.getNode(file as NodeId))!.asFile()!;
        const book = await loadBookFrom(remoteFileSystem, remoteFile);
        book.revision.id = file as NodeId;

        const localFile = await localFileSystem.createFileWithId(file as NodeId);
        await saveBookTo(book, localFileSystem, localFile);
        await localDesktop.link("シェア " + getCurrentDateTime(), localFile.id);
      }
      await recordCurrentFileInfo({id: file as NodeId, fileSystem: 'local'});
    } else if (urlParams.has('build')) {
      console.log("loadSharedBook: build");
      analyticsEvent('layover');
      const build = urlParams.get('build');
      if (!build) { return false; }
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
        attributes: { publishUrl: null },
        newPageProperty: {...trivialNewPageProperty}
      }
      commitBook(book, null);
      await saveBookTo(book, localFileSystem, localFile);
      await localDesktop.link(getCurrentDateTime(), localFile.id);
      await recordCurrentFileInfo({id: localFile.id as NodeId, fileSystem: 'local'});
    } else if (urlParams.has('reset')) {
      await clearCurrentFileInfo();
    } else {
      return false;
    }

    // いずれにせよリダイレクト
    let currentUrl = new URL(window.location.href);
    let urlWithoutQuery = currentUrl.origin + currentUrl.pathname;      

    window.history.replaceState(null, '', urlWithoutQuery);
    window.location.href = urlWithoutQuery;
    return true;
*/
      return false;
    }

  $:onNewBookRequest($newBookToken);
  async function onNewBookRequest(book: Book | null) {
    if (book) {
      console.tag("new book request", "green");
      $newBookToken = null;
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
      toastStore.trigger({ message: "新規ファイルを作成しました", timeout: 1500});
    }
  }

  $:onNewBubbleRequest($saveBubbleToken);
  async function onNewBubbleRequest(bubble: Bubble | null) {
    if (!bubble) { return; }
    console.log("onNewBubbleRequest");
    $saveBubbleToken = null;
    const root = localFolders.root;
    const folder = (await root.getNodeByName("テンプレート"))!.asFolder()!;
    const file = await localFileSystem.createFile();
    bubble.displayName= "ふきだし";
    await saveBubbleTo(bubble, file);
    await folder.link(getCurrentDateTime(), file.id);
    toastStore.trigger({ message: "フキダシテンプレートを登録しました<br/>シェイプと同様に使えます", timeout: 1500});
  }

  $:onLoadRequest($loadToken);
  async function onLoadRequest(lt: LoadToken | null) {
    if (!lt) { return; }
    $loadToken = null;

    $loading = true;
    const fsType = getFileSystemType(lt.fileSystem.id);
    if (fsType == 'cloud') {
      toastStore.trigger({ message: "クラウドファイルの読み込みには<br/>時間がかかることがあります", timeout: 3000});
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
    recordCurrentFileInfo({id: book.revision.id as NodeId, fileSystem: getFileSystemType(lt.fileSystem.id), title});
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
    toastStore.trigger({ message: "ファイルの読み込みに失敗しました。リロードします", timeout: 1500});
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
      filmProcessorQueue.publish(film);
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
      title: '保存フォルダの解除',
      message: '保存フォルダを解除しますか？\n※解除後、再び同じ場所を指定すれば再利用できます',
      positiveButtonText: '解除する',
      negativeButtonText: '解除しない',
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
      <h2>ブラウザストレージ</h2>
      <p>この領域はブラウザの「サイトデータ消去」操作などで消失する可能性があります。大事なファイルは「ローカルストレージ」や「クラウドストレージ」に退避するようにしてください。</p>
      <div class="mb-4"></div>
      <div class="cabinet variant-ghost-tertiary rounded-container-token">
        {#if $localState == 'linked'}
          <FileManagerFolder
            fileSystem={localFileSystem} 
            removability={"unremovable"} 
            spawnability={"file-spawnable"} 
            filename={"デスクトップ"} 
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
            filename={"キャビネット"} 
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
            filename={"ごみ箱"} 
            bindId={localFolders.trash[0]} 
            parent={localFolders.root} 
            index={1} 
            path={[localFolders.trash[0]]} 
            trash={null}
          />
        {/if}
      </div>
      <div class="flex flex-row gap-2 items-center justify-center">
        <p>ファイルシステム使用量: {usedSize ?? '計算中'}</p>
        <button class="btn-sm w-32 variant-filled" on:click={displayStoredImages}>画像一覧</button>
      </div>
      <div class="flex flex-row gap-2 items-center justify-center p-2">
        <button class="btn-sm w-32 variant-filled"  on:click={() => dump(localFileSystem)}>ダンプ</button>
        <button class="btn-sm w-32 variant-filled"  on:click={() => undump(localFileSystem)}>リストア</button>
      </div>
      <h2>ローカルストレージ</h2>
      <p>この領域はローカルのHDD、SSDなどに保存されます。</p>
      {#if $fsaState == 'unlinked'}
        <h3>保存フォルダ</h3>
        <p>
          データを保存するフォルダを指定してください。
          前回指定したフォルダが見えていない場合、同じ場所を指定すれば復活します。
        </p>
        <div class="flex flex-row ml-8 items-center gap-4">
          <button class="btn-sm w-48 variant-filled" on:click={selectStorageDirectory} disabled={!fsaapi}>
            保存フォルダを指定
          </button>
          {#if !fsaapi}
            <div>
              この環境ではローカルストレージを利用できません
            </div>  
          {/if}
        </div>
      {:else if $fsaState == 'linked'}
        <div class="cabinet variant-ghost-tertiary rounded-container-token">
          <FileManagerFolder
            fileSystem={fsaFileSystem} 
            removability={"unremovable"} 
            spawnability={"folder-spawnable"} 
            filename={`${storageFolderName}キャビネット`} 
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
            filename={`${storageFolderName}ごみ箱`} 
            bindId={fsaFolders.trash[0]} 
            parent={fsaFolders.root} 
            index={1} 
            path={[fsaFolders.trash[0]]} 
            trash={null}
          />
        </div>
        <div class="flex flex-row ml-8 items-center gap-4">
          <button class="btn-sm w-48 variant-filled" on:click={unlinkStorageDirectory} disabled={!fsaapi}>
            保存ディレクトリの解除
          </button>
        </div>
        <div class="flex flex-row gap-2 items-center justify-center p-2">
          <button class="btn-sm w-32 variant-filled"  on:click={() => dump(fsaFileSystem)}>ダンプ</button>
          <button class="btn-sm w-32 variant-filled"  on:click={() => undump(fsaFileSystem)}>リストア</button>
        </div>
      {:else}
        <p>
          <button class="btn-sm w-48 variant-filled">保存ディレクトリを解除</button>
        </p>
      {/if}

      <h2>クラウドストレージ</h2>
      <p>データをクラウドに保存します。この機能はβ版です。断りなくサービス停止する可能性があります。BASICプランで使えます。</p>
      {#if $cloudState == 'linked'}
        <div class="cabinet variant-ghost-primary rounded-container-token">
          <FileManagerFolder 
            fileSystem={cloudFileSystem} 
            removability={"unremovable"} 
            spawnability={"folder-spawnable"} 
            filename={"クラウドキャビネット"} 
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
            filename={"クラウドごみ箱"} 
            bindId={cloudFolders.trash[0]} 
            parent={cloudFolders.root} 
            index={1} 
            path={[cloudFolders.trash[0]]} 
            trash={null}
          />
        </div>
      {/if}
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
</style>
