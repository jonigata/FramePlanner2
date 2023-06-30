<script lang="ts">
  import Drawer from './Drawer.svelte'
  import FileManagerFolder from './FileManagerFolder.svelte';
  import { fileManagerOpen } from "./fileManagerStore";
  import { makeSample } from './lib/filesystem/sampleFileSystem';

  export let fileSystemRoot = makeSample();

  async function getCabinetAndTrash(root) {
    const cabinet = await root.getChild("キャビネット");
    const trash = await root.getChild("ごみ箱");
    console.log(cabinet, trash);
    return { cabinet, trash };
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

        </div>
      </div>
      <div class="cabinet variant-ghost-tertiary rounded-container-token">
        {#await fileSystemRoot}
          <div>loading...</div>
        {:then root}
          {#await getCabinetAndTrash(root)}
            <div>loading...</div>
          {:then h}
            <FileManagerFolder trash={h.trash} node={h.cabinet.asFolder()}/>
          {/await}
        {/await}
      </div>
      <div class="cabinet variant-ghost-secondary rounded-container-token">
        {#await fileSystemRoot}
          <div>loading...</div>
        {:then root}
          {#await getCabinetAndTrash(root)}
            <div>loading...</div>
          {:then h}
            <FileManagerFolder node={h.trash.asFolder()}/>
          {/await}
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
