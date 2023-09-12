<script lang="ts">
  import Drawer from './Drawer.svelte'
  import FileManagerFolder from './FileManagerFolder.svelte';
  import { fileManagerOpen, fileManagerRefreshKey, savePageTo, loadPageFrom } from "./fileManagerStore";
  import type { FileSystem } from './lib/filesystem/fileSystem';
  import { mainPage, revisionEqual } from './pageStore';
  import { onMount } from 'svelte';
  import type { Revision } from "./pageStore";

  export let fileSystem: FileSystem;

  let root = null;
  let desktop = null;
  let cabinet = null;
  let trash = null;
  let templates = null;
  let currentRevision: Revision = null;

  $:onUpdatePage($mainPage);
  async function onUpdatePage(page) {
    if (revisionEqual(page.revision, currentRevision)) {
      return;
    }

    if (page.revision.id === "bootstrap") { 
      // 初期化
      const desktop = await (await fileSystem.getRoot()).getNodeByName("デスクトップ");
      const files = await desktop.asFolder().list();
      if (files.length === 0) {
        // デスクトップにファイルが存在していない場合、仮ファイルをセーブする
        const file = await fileSystem.createFile();
        console.log("*********** savePageTo from FileManagerRoot(1)", currentRevision);
        await savePageTo(page, fileSystem, file);
        currentRevision = { id: file.id, revision: 1, prefix: "bootstrap2" };
        $mainPage = { ...page, revision: {...currentRevision} };
      } else {
        const file = files[0][2].asFile();
        const page = await loadPageFrom(fileSystem, file);
        currentRevision = {...page.revision};
        $mainPage = page;
      }
    } else {
      const file = await fileSystem.getNode(page.revision.id);
      console.log("*********** savePageTo from FileManagerRoot(2)");
      await savePageTo(page, fileSystem, file.asFile());
      currentRevision = {...page.revision};
    }
  }

  onMount(async () => {
    root = await fileSystem.getRoot();
    desktop = await root.getEntryByName("デスクトップ");
    cabinet = await root.getEntryByName("キャビネット");
    trash = await root.getEntryByName("ごみ箱");
    templates = await root.getEntryByName("テンプレート");
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
            <FileManagerFolder fileSystem={fileSystem} removability={"unremovable"} spawnability={"file-spawnable"} name={"デスクトップ"} bindId={desktop[0]} parent={root} index={0} path={[desktop[0]]}/>
          {/if}
        </div>
        <div class="cabinet variant-ghost-tertiary rounded-container-token">
          {#if cabinet}
            <FileManagerFolder fileSystem={fileSystem} removability={"unremovable"} spawnability={"folder-spawnable"} name={"キャビネット"} bindId={cabinet[0]} parent={root} index={0} path={[cabinet[0]]}/>
          {/if}
        </div>
        <div class="cabinet variant-ghost-secondary rounded-container-token">
          {#if trash}
            <FileManagerFolder fileSystem={fileSystem} removability={"unremovable"} spawnability={"unspawnable"} name={"ごみ箱"} bindId={trash[0]} parent={root} index={1} isTrash={true} path={[trash[0]]}/>
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
    {/key}
  </Drawer>
</div>

<style>
  .desktop {
    padding: 8px;
  }
  .desktop-sheet {
    width: 100%;
    height: 480px;
  }
  .cabinet {
    margin: 8px;
    padding: 8px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>
