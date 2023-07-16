<script lang="ts">
  import { fileManagerOpen, fileSystem } from "./fileManagerStore";
  import type { FileSystem } from './lib/filesystem/fileSystem';
  import { makeSample } from './lib/filesystem/sampleFileSystem';
  import FileManagerRoot from './FileManagerRoot.svelte';

  let fileSystemPromise = makeSample();

</script>

{#await fileSystemPromise}
<div>loading...</div>
{:then fileSystem}
  <FileManagerRoot fileSystem={fileSystem}/>
{/await}
