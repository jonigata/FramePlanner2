<script lang="ts">
  import { onMount } from 'svelte';
  import FileManagerRoot from './FileManagerRoot.svelte';
  //import { buildFileSystem } from './developmentFileSystem';
  import { buildFileSystem } from './productionFileSystem';
  import { FileSystem, folderTree } from '../lib/filesystem/fileSystem';
  import { createPreference, type FileSystemPreference } from '../preferences';
  import { buildFileSystem as buildLocalFileSystem } from './localFileSystem';

  let fileSystemPromise: Promise<FileSystem>;

  async function buildIndexedDBFileSystem() {
    console.log("building indexeddb filesystem");
    fileSystemPromise = buildFileSystem();    
  }

  async function buildCurrentFileSystem(fileSystemPreference: FileSystemPreference) {
    console.log("building fsa filesystem", fileSystemPreference.handle);
    try {
      const p = buildLocalFileSystem(fileSystemPreference.handle);
      console.log(await folderTree(await p));
      fileSystemPromise = p;
      // fileSystemPromise = buildLocalFileSystem(fileSystemPreference.handle);
    }
    catch(e) {
      console.log("building fsa filesystem failed");
      // fileSystemPromise = buildFileSystem();    
    }
  }

  onMount(async () => {
    const pref = createPreference<FileSystemPreference | null>("filesystem", "current");
    let fileSystemPreference = await pref.getOrDefault(null);
    // fileSystemPreference = null;

    if (fileSystemPreference == null) {
      await buildIndexedDBFileSystem();
    } else {
      await buildCurrentFileSystem(fileSystemPreference);
    }
  });
</script>

{#await fileSystemPromise}
<div>loading...</div>
{:then fileSystem}
  <FileManagerRoot fileSystem={fileSystem}/>
{/await}
