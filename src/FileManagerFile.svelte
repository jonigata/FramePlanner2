<script lang="ts">
  import { loadPageFrom } from "./fileManagerStore";
  import type { FileSystem, File } from "./lib/filesystem/fileSystem";
  import { mainPage } from './pageStore';

  export let fileSystem: FileSystem;
  export let name: string;
  export let node: File;
  export let removability = "removeable"; // "removable" | "unremovable-shallow" | "unremovable-deep"

  async function onDoubleClick() {
    const page = await loadPageFrom(fileSystem, node);
    $mainPage = page;
  }
</script>

<div class="file-title" on:dblclick={onDoubleClick}>{name}</div>

<style>
  .file-title {
    font-size: 16px;
    font-weight: 700;
    user-select: none;
  }
</style>
