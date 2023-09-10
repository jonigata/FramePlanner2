<script lang="ts">
  import Drawer from './Drawer.svelte'
  import FileManagerFolder from './FileManagerFolder.svelte';
  import FileManagerDesktop from "./FileManagerDesktop.svelte";
  import { fileManagerOpen, fileManagerRefreshKey, savePageTo } from "./fileManagerStore";
  import type { FileSystem } from './lib/filesystem/fileSystem';
  import { mainPage, revisionEqual } from './pageStore';
  import { onMount } from 'svelte';
  import { frameExamples } from './lib/layeredCanvas/frameExamples.js';
  import { FrameElement } from "./lib/layeredCanvas/frameTree";
  import type { Page } from "./pageStore";

  export let fileSystem: FileSystem;

  let root = null;
  let desktop = null;
  let cabinet = null;
  let trash = null;
  let templates = null;
  let currentRevision = null;

  $:onUpdateOuterPage($mainPage);
  async function onUpdateOuterPage(page) {
    if (revisionEqual(page.revision, currentRevision)) {
      return;
    }

    if (page.revision.id === "bootstrap") { 
      const file = await fileSystem.createFile();
      await savePageTo(page, fileSystem, file);
      currentRevision = { id: file.id, revision: 1 };
      $mainPage = { ...page, revision: {...currentRevision} };
    } else {
      const file = await fileSystem.getNode(page.revision.id);
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

    let files = await desktop[2].asFolder().list();
    if (files.length === 0) {
      // TODO: createPageを適当な場所に置く
      const page: Page = {
        frameTree: FrameElement.compile(frameExamples[0]),
        bubbles:[], 
        revision: {id:'dummy', revision:1}, 
        paperSize: [840, 1188],
        paperColor: '#ffffff',
        frameColor: '#000000',
        frameWidth: 2,
        history: [],
        historyIndex: 0,
      }

      const file = await fileSystem.createFile();
      await savePageTo(page, fileSystem, file);
      currentRevision = { id: file.id, revision: 1 };
      page.revision = {...currentRevision};
      await desktop[2].link("おためし", file);
      files = await desktop[2].asFolder().list();
      $mainPage = page;
    } else {
    }
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
