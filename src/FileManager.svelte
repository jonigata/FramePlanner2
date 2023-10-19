<script lang="ts">
  import { onMount } from 'svelte';
  import FileManagerRoot from './FileManagerRoot.svelte';
  //import { buildFileSystem } from './developmentFileSystem';
  import { buildFileSystem } from './productionFileSystem';
  import { fileSystem } from './fileManagerStore';

  let fileSystemPromise = buildFileSystem();
  onMount(async () => {
    $fileSystem = await fileSystemPromise;
  });
</script>

{#await fileSystemPromise}
<div>loading...</div>
{:then fileSystem}
  <FileManagerRoot fileSystem={fileSystem}/>
{/await}
