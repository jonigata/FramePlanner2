<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Film, FilmStack, ImageMedia } from "../../lib/layeredCanvas/dataModels/film";
  import { SortableList } from '@sonderbase/svelte-sortablejs';
  import { moveInArray } from '../../utils/moveInArray';

  // import ListBox from "../../utils/listbox/ListBox.svelte";
  // import ListBoxItem from "../../utils/listbox/ListBoxItem.svelte";
  import FilmListItem from "./FilmListItem.svelte";

  export let filmStack: FilmStack;

  const dispatch = createEventDispatcher();

  for (let i = 0; i < filmStack.films.length; i++) {
    filmStack.films[i].index = i;
  }

  async function onNewFilm(e: CustomEvent<{ index: number, files: FileList }>) {
    let { index, files } = e.detail;
    const file = files[0];
    if (file.type.startsWith("image/")) {
      const imageURL = URL.createObjectURL(file);
      const image = new Image();
      image.src = imageURL;
      await image.decode();

      if (0 < index) {
        index--;
      }
      index = filmStack.films.length - index;

      const film = new Film();
      film.media = new ImageMedia(image);
      filmStack.films.splice(index, 0, film);
      dispatch('commit');
      filmStack = filmStack;
    }
  }

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
    console.log("onUpdate", e.oldIndex, e.newIndex);
    console.log("moveFilm(before)", e.oldIndex, e.newIndex, filmStack.films.map(f => f.index));
    moveInArray(filmStack.films, e.oldIndex, e.newIndex);
    console.log("moveFilm(after)", e.oldIndex, e.newIndex, filmStack.films.map(f => f.index));
    dispatch('commit');
    filmStack = filmStack;
  }

</script>

<FilmListItem film={null} on:select={onGenerate}/>
<SortableList class="flex flex-col gap-2 mt-2" animation={100} onUpdate={onUpdate}>
  {#each filmStack.films.toReversed() as film}
    <FilmListItem bind:film={film} on:select={onSelectFilm} on:delete={onDeleteFilm} on:scribble={onScribble} on:generate={onGenerate} on:punch={onPunch}/>
  {/each}
</SortableList>  

<style>
  :global(.listbox) {
    gap: 16px;
  }
</style>