<script lang="ts">
  import Drawer from './Drawer.svelte'
  import FileManagerFolder from './FileManagerFolder.svelte';
  import FileManagerDesktop from "./FileManagerDesktop.svelte";
  import { fileManagerOpen } from "./fileManagerStore";
  import type { FileSystem } from './lib/filesystem/fileSystem';
  import { makeSample } from './lib/filesystem/sampleFileSystem';

  export let fileSystem: FileSystem;

  async function getSystemFolders() {
    const cabinet = await (await fileSystem.getRoot()).get("キャビネット");
    const trash = await (await fileSystem.getRoot()).get("ごみ箱");
    const templates = await (await fileSystem.getRoot()).get("テンプレート");
    console.log(cabinet, trash, templates);
    return { cabinet, trash, templates };
  }
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
