<script lang="ts">
  import { makeSample } from './lib/filesystem/sampleFileSystem';
  import FileManagerRoot from './FileManagerRoot.svelte';

  let fileSystemPromise = makeSample();

</script>

{#await fileSystemPromise}
<div>loading...</div>
{:then fileSystem}
  <FileManagerRoot fileSystem={fileSystem}/>
{/await}
