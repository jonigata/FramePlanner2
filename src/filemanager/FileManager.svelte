<script lang="ts">
  import { onMount } from 'svelte';
  import FileManagerRoot from './FileManagerRoot.svelte';
  //import { buildFileSystem } from './developmentFileSystem';
  import { buildFileSystem } from './productionFileSystem';
  import { FileSystem, folderTree } from '../lib/filesystem/fileSystem';

  let fileSystemPromise: Promise<FileSystem>;

  onMount(async () => {
    fileSystemPromise = buildFileSystem();    
  });
</script>

{#await fileSystemPromise}
<div>loading...</div>
{:then fileSystem}
  <FileManagerRoot fileSystem={fileSystem}/>
{/await}
