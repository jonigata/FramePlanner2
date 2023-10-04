<script lang="ts">
  import Drawer from './Drawer.svelte'
  import FileManagerFolder from './FileManagerFolder.svelte';
  import { fileManagerOpen, fileManagerRefreshKey, savePageTo } from "./fileManagerStore";
  import type { FileSystem, NodeId } from './lib/filesystem/fileSystem';
  import { type Page, mainPage, revisionEqual, commitPage, getRevision } from './pageStore';
  import { onMount } from 'svelte';
  import type { Revision } from "./pageStore";

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
      // 初期化時は仮ファイルをセーブする
      const root = await fileSystem.getRoot();
      const desktop = await root.getNodeByName("デスクトップ");
      const file = await fileSystem.createFile();
      console.log("*********** savePageTo from FileManagerRoot(1)", currentRevision);
      await savePageTo(page, fileSystem, file);
      await desktop.asFolder().link("bootstrap", file.id);
      const newPage = commitPage(page, page.frameTree, page.bubbles, null);
      newPage.revision.id = file.id;
      newPage.revision.prefix = "standard";
      currentRevision = getRevision(newPage);
      $mainPage = newPage;
      $fileManagerRefreshKey++;
    } else {
      const file = await fileSystem.getNode(page.revision.id as NodeId);
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
  .cabinet {
    margin: 8px;
    padding: 8px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>
