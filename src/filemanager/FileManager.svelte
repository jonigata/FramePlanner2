<script lang="ts">
  import { onMount } from 'svelte';
  import FileManagerRoot from './FileManagerRoot.svelte';
  //import { buildFileSystem } from './developmentFileSystem';
  import { buildFileSystem } from './productionFileSystem';
  import { FileSystem, folderTree } from '../lib/filesystem/fileSystem';

  let fileSystemPromise = buildFileSystem();    
</script>

{#await fileSystemPromise then fileSystem}
  <FileManagerRoot localFileSystem={fileSystem}/>
{/await}
