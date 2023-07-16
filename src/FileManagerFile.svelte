<script lang="ts">
  import type { File } from "./lib/filesystem/fileSystem";

  export let name: string;
  export let node: File;
  export let removability = "removeable"; // "removable" | "unremovable-shallow" | "unremovable-deep"
</script>

<div class="file-title">{name}</div>

<style>
  .file-title {
    font-size: 16px;
    font-weight: 700;
  }
</style>
