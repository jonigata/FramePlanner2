<script lang="ts">
  import FileManagerRoot from './FileManagerRoot.svelte';
  import { buildFileSystem } from './developmentFileSystem';

  let fileSystemPromise = buildFileSystem();
</script>

{#await fileSystemPromise}
<div>loading...</div>
{:then fileSystem}
  <FileManagerRoot fileSystem={fileSystem}/>
{/await}
