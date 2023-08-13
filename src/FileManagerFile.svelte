<script lang="ts">
  import { loadPageFrom } from "./fileManagerStore";
  import type { BindId, FileSystem, Folder, File } from "./lib/filesystem/fileSystem";
  import { mainPage } from './pageStore';

  export let fileSystem: FileSystem;
  export let name: string;
  export let bindId: BindId;
  export let parent: Folder;
  export let removability = "removeable"; // "removable" | "unremovable-shallow" | "unremovable-deep"

  async function onDoubleClick() {
    const file = await parent.get(bindId) as File;
    const page = await loadPageFrom(fileSystem, file);
    $mainPage = page;
  }

	export function onDragStart (ev) {
		ev.dataTransfer.setData("bindId", bindId);
		ev.dataTransfer.setData("parent", parent.id);
	}
</script>

<div class="file-title" draggable={true} on:dblclick={onDoubleClick} on:dragstart={onDragStart}>{name}</div>

<style>
  .file-title {
    font-size: 16px;
    font-weight: 700;
    user-select: none;
  }
</style>
