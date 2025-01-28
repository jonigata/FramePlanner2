<script lang="ts">
  import type { FileSystem, Folder, NodeId, BindId, Node, EmbodiedEntry } from "../lib/filesystem/fileSystem";
  import FileManagerFile from "./FileManagerFile.svelte";
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { fileManagerDragging, newFile, type Dragging, getCurrentDateTime, fileManagerUsedSizeToken, copyBookOrFolderInterFileSystem, saveBookTo } from "./fileManagerStore";
  import { readEnvelope, readOldEnvelope } from "../lib/book/envelope";
  import { newBook } from "../lib/book/book";
  import { mainBook } from '../bookeditor/bookStore';
  import FileManagerFolderTail from "./FileManagerFolderTail.svelte";
  import FileManagerInsertZone from "./FileManagerInsertZone.svelte";
  import RenameEdit from "../utils/RenameEdit.svelte";
  import { toolTip } from '../utils/passiveToolTipStore';
  import { loading, progress } from '../utils/loadingStore'
  import { collectGarbage, purgeCollectedGarbage } from "../utils/garbageCollection";

  import newFileIcon from '../assets/fileManager/new-file.png';
  import newFolderIcon from '../assets/fileManager/new-folder.png';
  import trashIcon from '../assets/fileManager/trash.png';
  import folderIcon from '../assets/fileManager/folder.png';
  import renameIcon from '../assets/fileManager/rename.png';

  export let fileSystem: FileSystem;
  export let filename: string;
  export let bindId: BindId;
  export let parent: Folder;
  export let trash: Folder | null; // 捨てるときの対象、ごみ箱自身はnull
  export let removability: "removable" | "unremovable" = "removable";
  export let spawnability: "file-spawnable" | "folder-spawnable" | "unspawnable" = "unspawnable";
  export let index: number;
  export let path: string[];

  let node: Folder;
  let acceptable: boolean;
  let isDraggingOver: boolean;
  let isDiscardable = false;
  let renameEdit: RenameEdit;
  let renaming = false;
  let isRootTrash = false;
  let embodiedEntries: EmbodiedEntry[] = [];

  const dispatch = createEventDispatcher();

  $: updateEntries(node);
  async function updateEntries(node: Folder) {
    if (node) {
      embodiedEntries = await node.listEmbodied();
    }
  }

  $: ondrag($fileManagerDragging);
  function ondrag(dragging: Dragging | null) {
    acceptable = dragging != null && !path.includes(dragging.bindId);
  }

  async function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    isDraggingOver = true;
  }

  function onDragLeave() {
    isDraggingOver = false;
  }

  async function onDropHere(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (acceptable) {
      console.log(ev);
      await moveToHere(0);
    } else {
      // jsonだったら、jsonの中身を見て、適切な処理をする
      if (ev.dataTransfer?.files.length === 1) {
        const file = ev.dataTransfer.files[0];
        const fileName = file.name;
        if (file.type === "application/json") {
          // 旧タイプのenvelope
          try {
            $loading = true;
            const json = await file.text();
            const book = await readOldEnvelope(json);
            const newFile = await fileSystem.createFile();
            await saveBookTo(book, fileSystem, newFile);
            await node.link("パッケージ", newFile.id);
            node = node;
          }
          finally {
            $loading = false;
          }
          return;
        }
        if (fileName.endsWith(".envelope")) {
          // 新タイプのenvelope
          try {
            $progress = 0;
            const book = await readEnvelope(file, n => $progress = n);
            const newFile = await fileSystem.createFile();
            book.revision.id = newFile.id;
            $progress = null;
            $loading = true;
            await saveBookTo(book, fileSystem, newFile);
            const basename = fileName.replace(/\.envelope$/, "");
            console.log("importing done")
            await node.link(basename, newFile.id);
            node = node;
            $loading = false;
          }
          finally {
            $progress = null;
            $loading = false;
          }
          return;
        }        
      } 
      console.log("not acceptable");
    }
  }

  async function addFolder() {
    console.log("add folder");
    const nf = await fileSystem.createFolder();
    await node.link("new folder", nf.id);
    node = node;
  }

  async function addFile() {
    console.log("add file");
    const book = newBook("not visited", "add-in-folder-", 0);
    await newFile(fileSystem, node, getCurrentDateTime(), book);
    node = node;
  }

  async function removeFolder() {
    dispatch('remove', bindId);
  }

  async function removeChild(e: CustomEvent<BindId>) {
    console.log("remove child", e.detail, trash);
    const childBindId = e.detail as BindId;
    const childEntry = (await node.getEntry(childBindId))!;
    if (trash) {
      console.log("trash link", trash.id);
      await trash.link(childEntry[1], childEntry[2]);
    }
    await node.unlink(childBindId);
    node = node;
  }

  function onInsertToParent(ev: CustomEvent<DataTransfer>) {
    console.log("insert to parent", ev.detail);
    isDraggingOver = false;
    const detail = { dataTransfer: ev.detail, index };
    dispatch('insert', detail);
    ev.preventDefault();
    ev.stopPropagation();
    $fileManagerDragging = null;
  }

  function onDragStart(ev: DragEvent) {
    console.log("folder drag start", bindId, parent.id, renaming);
    if (renaming || removability === "unremovable") {
      ev.preventDefault();
      return;
    }
    ev.dataTransfer!.setData("bindId", bindId);
    ev.dataTransfer!.setData("parent", parent.id);
    ev.stopPropagation();
    setTimeout(() => {
      // こうしないとなぜかdragendが即時発火してしまう
      $fileManagerDragging = { fileSystem, bindId, parent: parent.id };
    }, 0);
  }

  async function onInsert(e: CustomEvent<{ dataTransfer: DataTransfer, index: number }>) {
    console.log("insert", e.detail);
    await moveToHere(e.detail.index);
  }

  async function moveToHere(index: number | null) {
    const dragging = $fileManagerDragging!;
    console.log("++++++++++++ moveToHere", dragging, index);

    const sourceParent = (await dragging.fileSystem.getNode(dragging.parent)) as Folder;
    const mover = (await sourceParent.getEntry(dragging.bindId))!;

    if (index === null) {
      index = (await node.list()).length;      
    }

    if (fileSystem.id === dragging.fileSystem.id) {
      console.log("same filesystem move", node.id, "target index =", index);

      await sourceParent.unlink(dragging.bindId);
      await node.insert(mover[1], mover[2], index);
      console.log("insert done");
    } else {
      console.log("different filesystem move (is copy)", node.id, "target index =", index);

      $loading = true;
      const sourceNodeId = mover[2];
      const targetFileId = await copyBookOrFolderInterFileSystem(dragging.fileSystem, fileSystem, sourceNodeId);
      await node.insert(mover[1], targetFileId, index);
      $loading = false;
    }
  }

  async function recycle() {
    const editingId = $mainBook!.revision.id as NodeId;
    await recycleNode(node, editingId);
    if (!fileSystem.isVault) {
      $loading = true;
      const { usedImageFiles, strayImageFiles } = await collectGarbage(fileSystem);
      console.log("usedImageFiles", usedImageFiles);
      console.log("strayImageFiles", strayImageFiles);
      const imageFolder = (await (await fileSystem.getRoot()).getNodeByName("画像"))!.asFolder()!;
      await purgeCollectedGarbage(fileSystem, imageFolder, strayImageFiles);
      $loading = false;
    }
    $fileManagerUsedSizeToken = fileSystem;
    node = node;
  }

  // TODO: だいぶ遅い
  async function recycleNode(curr: Node, editingId: NodeId) {
    if (curr.getType() === "folder") {
      const folder = curr.asFolder()!;
      const entries = await folder.listEmbodied();
      for (const entry of entries) {
        if (entry[2].id === editingId) { continue; } // 編集中のファイルは消さない
        if (curr.id === node.id) { // node以外はどうせ親を消すのでunlink不要
          await folder.unlink(entry[0]);
        }
        await recycleNode(entry[2], editingId);
      }
    }
    if (curr.id !== node.id) {
      await fileSystem.destroyNode(curr.id);
    }
  }

  async function renameChild(e: CustomEvent<{ bindId: BindId, name: string }>) {
    console.log("rename child", e.detail);
    const { bindId, name } = e.detail;
    await node.rename(bindId, name);
    node = node;
  }

  function startRename() {
    console.log("renameFile");
    renameEdit.setFocus();
  }

  function submitRename(e: CustomEvent<string>) {
    console.log("submitRename", e.detail);
    dispatch('rename', { bindId, name: e.detail });
    renaming = false;
  }

  const watcher = {
    onInsert: (bindId: BindId, index: number, sourceParent: Folder | null) => {
      console.log("onInsert", bindId, index, sourceParent);
      node = node;
    },
    onDelete: (bindId: BindId) => {
      console.log("onDelete", bindId);
      node = node;
    },
    onRename: (bindId: BindId, newName: string) => {
      console.log("onRename", bindId, newName);
      node = node;
    }
  }
  let watching = false;

  onMount(async () => {
    const root = await fileSystem.getRoot();
    isRootTrash = trash == null && parent.id === root.id;

    const entry: [BindId, string, Node] = (await parent.getEmbodiedEntry(bindId))!
    node = entry[2] as Folder;
    isDiscardable = removability === "removable" && trash != null;
    node.watch(watcher);
    watching = true;
  });

  onDestroy(() => {
    if (watching) {
      node.unwatch(watcher);
    }
  });

</script>

{#if node}
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="folder"
  on:dragover={onDragOver} 
  on:dragstart={onDragStart}
  on:dragleave={onDragLeave}
  on:drop={onDropHere}
>
  <div
    class="folder-title-line" 
    class:no-select={removability === "unremovable"}
    draggable={removability === "removable"}
  >
    <div class="folder-title">
      <div class="foldername" use:toolTip={"ドラッグで移動"}>
        <img class="button" src={folderIcon} alt="symbol"/>
        <RenameEdit bind:this={renameEdit} bind:editing={renaming} value={filename} on:submit={submitRename}/>
      </div>
      {#if isRootTrash}
        <button class="btn btn-sm variant-filled recycle-button px-1 py-0" on:click={recycle}>空にする</button>
      {/if}
      <div class="button-container">
        {#if spawnability === "file-spawnable"}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <img class="button" src={newFileIcon} alt="new file" on:click={addFile} use:toolTip={"ページ作成"}/>
        {/if}
        {#if spawnability === "folder-spawnable"}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <img class="button" src={newFolderIcon} alt="new folder" on:click={addFolder} use:toolTip={"フォルダ作成"}/>
        {/if}
      </div> 
    </div>
    <div class="buttons hbox gap-2">
      <div class="button-container">
        {#if isDiscardable}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <img class="button" src={renameIcon} alt="rename" on:click={startRename} use:toolTip={"フォルダ名変更"}/>
        {/if}
      </div>  
      <div class="button-container">
        {#if isDiscardable}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <img class="button" src={trashIcon} alt="trash" on:click={removeFolder} use:toolTip={"捨てる"}/>
        {/if}
      </div>
    </div>
    {#if removability === 'removable'}
      <FileManagerInsertZone on:drop={onInsertToParent} bind:acceptable={acceptable} depth={path.length}/>
    {/if}
  </div>
  <div class="folder-contents"
    class:acceptable={isDraggingOver && acceptable}
  >
    {#each embodiedEntries as [bindId, filename, childNode], index (childNode.id)}
      {#if childNode.getType() === 'folder'}
        <svelte:self fileSystem={fileSystem} removability={"removable"} spawnability={spawnability} filename={filename} bindId={bindId} parent={node} index={index} on:insert={onInsert} on:remove={removeChild} path={[...path, bindId]} on:rename={renameChild} trash={trash}/>
      {:else if childNode.getType() === 'file'}
        <FileManagerFile fileSystem={fileSystem} removability={"removable"} nodeId={childNode.id} filename={filename} bindId={bindId} parent={node} index={index} on:insert={onInsert} path={[...path, bindId]} on:remove={removeChild} on:rename={renameChild} trash={trash}/>
      {/if}
    {/each}
    <FileManagerFolderTail index={embodiedEntries.length} on:insert={onInsert} path={[...path, 'tail']}/>
  </div>
</div>
{/if}

<style>
  .folder {
    text-align: left;
  }
  .folder-title-line {
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 24px;
    position: relative; /* InsertZone用 */
  }
  .folder-title-line:hover {
    background-color: #fff4;
  }
  .folder-title {
    font-size: 16px;
    font-weight: 700;
    display: flex;
    flex-direction: row;
    align-items: center;
    font-family: 'Zen Maru Gothic';
    font-weight: 700;
    font-style: normal;
    width: 100%;
    height: 20px;
    margin-left: 4px;
  }
  .foldername {
    background: rgb(221, 235, 189);
    border-radius: 8px;
    padding-left: 4px;
    padding-right: 4px;
    padding-top: 2px;
    padding-bottom: 2px;
    display: flex;
    flex-direction: row;
    margin-right: 8px;
  }
  .folder-contents {
    padding-left: 16px;
    box-sizing: border-box;
    /* border: 2px dashed transparent; /* 初期状態では透明にしておく */
  }
  .folder-contents.acceptable {
    background-color: #ee84;
    /* border: 2px dashed #444; */
    box-shadow: 0 0 0 2px #444 inset; /* inset を使用して要素の内側に影を追加 */
  }
  .buttons {
    gap: 0px;
  }
  .button-container {
    width: 20px;
    height: 16px;
    display: flex;
    gap: 4px;
  }
  .button {
    width: 16px;
    height: 16px;
    display: inline;
  }
  .no-select {
    user-select: none; /* 標準のCSS */
    -webkit-user-select: none; /* Chrome, Safari */
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* IE/Edge */
  }
</style>
