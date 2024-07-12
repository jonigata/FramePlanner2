<script lang="ts">
  import '../box.css';
  import { type Book, newPage, commitBook, newImageBook } from '../bookeditor/book';
  import { type NewPageProperty, mainPage, mainBook, viewport, newPageProperty, redrawToken } from '../bookeditor/bookStore';
  import { bodyDragging } from '../uiStore';
  import { aboutOpen } from '../about/aboutStore';
  import { structureTreeOpen } from '../about/structureTreeStore';
  import { materialBucketOpen } from '../materialBucket/materialBucketStore';
  import { isPendingRedirect, postContact, prepareAuth, listSharedImages, getAuth } from '../firebase';
	import ColorPicker from 'svelte-awesome-color-picker';
  import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
  import { fileSystem, newBookToken } from '../filemanager/fileManagerStore';
  import type { IndexedDBFileSystem } from "../lib/filesystem/indexeddbFileSystem";
  import { accountUser } from "../utils/accountStore";
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import { dominantMode } from "../uiStore";
  import { controlPanelOpen } from "./controlPanelStore";

  import { onMount } from "svelte";


  $:onUpdatePaperProperty($newPageProperty);
  function onUpdatePaperProperty(q: NewPageProperty) {
    if (!$newPageProperty) { return; }
    console.log("#### newPageProperty")
    if (!$mainBook) { return; }

    let changed = false;
    for (let p of $mainBook.pages) {
      if (p.paperSize[0] === q.paperSize[0] && p.paperSize[1] === q.paperSize[1]) {
        continue;
      }

      p.paperSize[0] = q.paperSize[0];
      p.paperSize[1] = q.paperSize[1];
      changed = true;
    }
    if (changed) {
      commitBook($mainBook, "page-attribute");
      $mainBook = $mainBook;
      $viewport.dirty = true;
      console.log("ControlPanel.onUpdatePaperProperty", q);
      console.log($newPageProperty);
      console.log($mainBook);
      $redrawToken = true;
    }
  }

  $:onUpdateMainBook($mainBook);
  function onUpdateMainBook(book: Book) {
    if (!$mainBook) { return; }
    console.log("#### mainBook")
    const p = $newPageProperty;
    const q = $mainBook.pages[0];
    
    p.paperSize[0] = q.paperSize[0];
    p.paperSize[1] = q.paperSize[1];
    p.paperColor = q.paperColor;
    p.frameColor = q.frameColor;
    p.frameWidth = q.frameWidth;
    $newPageProperty = p;
  }

  function applyTemplate(event: CustomEvent<{ frameTree: any, bubbles: any }>) {
    const p = $newPageProperty;
    const sample = event.detail;
    const frameTree = FrameElement.compile(sample.frameTree);
    const bubbles = sample.bubbles.map(b => Bubble.compile(p.paperSize, b));
    const page = newPage(frameTree, bubbles);
    page.paperSize = [...p.paperSize];
    page.paperColor = p.paperColor;
    page.frameColor = p.frameColor;
    page.frameWidth = p.frameWidth;
    $mainBook.pages.push(page);
    commitBook($mainBook, null);
    $mainBook = $mainBook;
  }

  function changeTemplate(event: CustomEvent<number>) {
    if ($newPageProperty.templateIndex != event.detail) {
      $newPageProperty.templateIndex = event.detail;    
    }
  }

  async function dumpFileSystem() {
    await ($fileSystem as IndexedDBFileSystem).dump();
  }

  let dumpFiles;
  $: onUndumpFileSystem(dumpFiles);
  async function onUndumpFileSystem(dumpFiles) {
    if (dumpFiles) {
      for (const file of dumpFiles) {
        const s = await readFileAsText(file);
        await ($fileSystem as IndexedDBFileSystem).undump(s);
        console.log("undump done");
      }
    }
  }

  let files: FileList;
  $: uploadImage(files);
  async function uploadImage(files: FileList) {
    if (files && files.length > 0) {
      const file = files[0];
      console.log(file.type)
      if (file.type.startsWith("image/")) {
        const imageURL = URL.createObjectURL(file); 
        const image = new Image();

        const imageLoaded = new Promise((resolve) => image.onload = resolve);          
        image.src = imageURL;
        await imageLoaded;
        URL.revokeObjectURL(imageURL); // オブジェクトURLのリソースを解放

        const book = newImageBook('not visited', image, "drop-")
        $newBookToken = book;
      } else if (file.type.startsWith("text/") || file.type.startsWith("application/json")) {
        const text = await readFileAsText(file);
        const json = JSON.parse(text);
        $mainPage.frameTree = FrameElement.compile(json.frameTree);
        $mainPage.bubbles = json.bubbles.map((b: Bubble) => Bubble.compile($mainPage.paperSize, b));
      }
    }
  }

  function readFileAsText(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  function about() {
    console.log("about");
    $aboutOpen = true;
  }

  function structureTree() {
    console.log("structureTree");
    $structureTreeOpen = true;
  }

  function materialBucket() {
    console.log("materialBucket");
    $materialBucketOpen = true;
  }

  async function callListSharedImages() {
    await listSharedImages();
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    files = e.dataTransfer.files;
  }

  function openVideoMaker() {
    console.log([...$mainBook.pages[0].bubbles]);

    const d: ModalSettings = {
      type: 'component',
      component: 'videoMaker',
    };
    modalStore.trigger(d);    
  }

</script>

{#if $controlPanelOpen && $dominantMode != "painting" && $viewport}
<div class="control-panel variant-glass-surface rounded-container-token" style="pointer-events: {$bodyDragging ? 'none' : 'auto'};">
</div>
{/if}

<style>
  .control-panel {
    position: absolute;
    width: 400px;
    display: flex;
    flex-direction: column;
    top: 32px;
    left: 0px;
    padding-top: 8px;
    padding-bottom: 8px;
  }
  .slider-label {
    width: 20px;
  }
  .slider-value-text {
    width: 76px;
    text-align: right;
  }
  .canvas-size-container {
    margin-right: 16px;
    margin-top: 4px;
  }
  .number-box {
    width: 35px;
    height: 20px;
    display: inline-block;
    vertical-align: bottom;
  }
  .paper-size {
    height: 20px;
  }
  .download-button {
    width: 125px;
    height: 35px;
  }
  .button-icon {
    width: 32px;
    height: 32px;
  }
  .textarea {
    resize: none;
  }
  .paper-color-picker :global(.container .color) {
    width: 15px;
    height: 15px;
    border-radius: 4px;
  }
  .paper-color-picker :global(.container .alpha) {
    width: 15px;
    height: 15px;
    border-radius: 4px;
  }
  .function-button {
    width: 125px;
  }
  .radio-text {
    height: 10px;
  }
  .radio-box {
    height: 35px;
  }
  .radio-box :global(.radio-item) {
    padding-top: 0px;
    padding-bottom: 0px;
    padding-left: 10px;
    padding-right: 10px;
  }
  .dummy {
    display: none;
  }

</style>
