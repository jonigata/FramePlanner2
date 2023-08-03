<script lang="ts">
  import Drawer from './Drawer.svelte'
  import FileManagerFolder from './FileManagerFolder.svelte';
  import FileManagerDesktop from "./FileManagerDesktop.svelte";
  import { fileManagerOpen, savePageTo } from "./fileManagerStore";
  import type { FileSystem } from './lib/filesystem/fileSystem';
  import { mainPage, revisionEqual } from './pageStore';
  import { onMount } from 'svelte';
  import { frameExamples } from './lib/layeredCanvas/frameExamples.js';
  import { FrameElement } from "./lib/layeredCanvas/frameTree";
  import type { Page } from "./pageStore";

  export let fileSystem: FileSystem;

  let currentRevision = null;

  async function getSystemFolders() {
    const cabinet = await (await fileSystem.getRoot()).get("キャビネット");
    const trash = await (await fileSystem.getRoot()).get("ごみ箱");
    const templates = await (await fileSystem.getRoot()).get("テンプレート");
    console.log(cabinet, trash, templates);
    return { cabinet, trash, templates };
  }

  $:onUpdateOuterPage($mainPage);
  async function onUpdateOuterPage(page) {
    console.log("saving: ", page.revision);
    if (revisionEqual(page.revision, currentRevision)) {
      console.log("skip saving");
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
    const root = await fileSystem.getRoot();
    const desktop = (await root.get("デスクトップ")).asFolder();
    let files = await desktop.asFolder().list();
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
      }

      const file = await fileSystem.createFile();
      await savePageTo(page, fileSystem, file);
      currentRevision = { id: file.id, revision: 1 };
      page.revision = {...currentRevision};
      await desktop.link("おためし", file);
      files = await desktop.asFolder().list();
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
    <div class="drawer-content">
      <div class="desktop">
        <div class="desktop-sheet variant-soft-primary surface rounded-container-token">
          <FileManagerDesktop/>
        </div>
      </div>
      <div class="cabinet variant-ghost-tertiary rounded-container-token">
        {#await getSystemFolders()}
          <div>loading...</div>
        {:then h}
          <FileManagerFolder fileSystem={fileSystem} removability={"unremovable-shallow"} spawnability={"spawnable"} name={"キャビネット"} node={h.cabinet.asFolder()}/>
        {/await}
      </div>
      <div class="cabinet variant-ghost-secondary rounded-container-token">
        {#await getSystemFolders()}
          <div>loading...</div>
        {:then h}
          <FileManagerFolder fileSystem={fileSystem} removability={"unremovable-deep"} spawnability={"unspawnable"} name={"ごみ箱"} node={h.trash.asFolder()} isTrash={true}/>
        {/await}
      </div>
      <div class="cabinet variant-ghost-secondary rounded-container-token">
        {#await getSystemFolders()}
          <div>loading...</div>
        {:then h}
          <FileManagerFolder fileSystem={fileSystem} removability={"unremovable-shallow"} spawnability={"unspawnable"} name={"テンプレート"} node={h.templates.asFolder()} isTrash={true}/>
        {/await}
      </div>
    </div>
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
