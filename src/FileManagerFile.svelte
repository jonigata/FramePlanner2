<script lang="ts">
  import type { File } from "./lib/filesystem/fileSystem";

  export let node: File = null;
</script>

<div class="file-title">{node.name}</div>

<style>
  .file-title {
    font-size: 16px;
    font-weight: 700;
  }
</style>
