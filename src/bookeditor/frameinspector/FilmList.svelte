<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Film, FilmStack, ImageMedia } from "../../lib/layeredCanvas/dataModels/film";
  import { sortableList } from '../../utils/sortableList'
  import { fileDroppableList, FileDroppableContainer } from '../../utils/fileDroppableList'
  import { moveInArray } from '../../utils/moveInArray';
  import FilmListItem from "./FilmListItem.svelte";
  
  export let filmStack: FilmStack;

  const dispatch = createEventDispatcher();

  for (let i = 0; i < filmStack.films.length; i++) {
    filmStack.films[i].index = i;
  }

  let isDragging = false;
  let ghostIndex = -1;

  function importFiles(files: FileList): Film[] {
    console.log("importFiles");
    const file = files[0];
    if (file.type.startsWith("image/")) {
      console.log("image file");
      const imageURL = URL.createObjectURL(file);
      const image = new Image();
      image.src = imageURL;

      const film = new Film();
      film.media = new ImageMedia(image);
      film.index = filmStack.films.length;
      return [film];
    }
    return [];
  }

  function onAcceptDrop(newIndex: number, films: Film[]) {
    const index = filmStack.films.length - newIndex;
    filmStack.films.splice(index, 0, ...films);
    console.log("onAcceptDrop", newIndex, index);
  }

  function onGhost(newIsDragging: boolean, newGhostIndex: number) {
    isDragging = newIsDragging;
    ghostIndex = newGhostIndex;
    console.log("ghost", ghostIndex);
  }

  const fileDroppableContainer = new FileDroppableContainer(
    filmStack.films, 
    importFiles,
    onAcceptDrop,
    onGhost);

  function onSelectFilm(e: CustomEvent<{ film: Film, ctrlKey: boolean, metaKey: boolean }>) {
    const { film, ctrlKey, metaKey } = e.detail;

    if (!ctrlKey && !metaKey) {
      const oldSelected = film.selected;
      filmStack.films.forEach(f => f.selected = false);
      film.selected = !oldSelected;
    } else {
      film.selected = !film.selected;
    }
    filmStack = filmStack;
  }

  function onDeleteFilm(e: CustomEvent<Film>) {
    const film = e.detail;
    filmStack.films = filmStack.films.filter(f => f !== film);
    dispatch('commit');
    filmStack = filmStack;
  }

  function onScribble(e: CustomEvent<Film>) {
    console.log("onScribble", e.detail);
    dispatch('scribble', e.detail);
  }

  function onGenerate() {
    dispatch('generate');
  }

  function onPunch(e: CustomEvent<Film>) {
    console.log("onPunch", e.detail);
    dispatch('punch', e.detail);
  }

  function onUpdate(e: {oldIndex: number, newIndex:number}) {
    // reversed order
    const oldIndex = filmStack.films.length - 1 - e.oldIndex;
    const newIndex = filmStack.films.length - 1 - e.newIndex;
    //const oldIndex = e.oldIndex;
    // const newIndex = e.newIndex;
    moveInArray(filmStack.films, oldIndex, newIndex);
    dispatch('commit');
    filmStack = filmStack;
  }

</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="film-list-container">
  <div 
    class="flex flex-col gap-2 mb-2" 
    use:sortableList={{animation: 100, onUpdate}} 
    use:fileDroppableList={fileDroppableContainer.getDropZoneProps()}
  >
    {#each filmStack.films.toReversed() as film, index (film.index)}
      {#if isDragging && ghostIndex === index}
        <div data-ghost class="ghost-element"/>
      {/if}
      <FilmListItem bind:film={film} on:select={onSelectFilm} on:delete={onDeleteFilm} on:scribble={onScribble} on:generate={onGenerate} on:punch={onPunch}/>
    {/each}
    {#if isDragging && ghostIndex === filmStack.films.length}
      <div data-ghost class="ghost-element"/>
    {/if}
  </div>  
  <FilmListItem film={null} on:select={onGenerate}/>
</div>

<style>
  .ghost-element {
    height: 20px;
    background-color: #007bff;
    margin: 5px 0;
  }
  :global(.listbox) {
    gap: 16px;
  }
</style>