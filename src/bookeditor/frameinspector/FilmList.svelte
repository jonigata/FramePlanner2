<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Film, FilmStack, ImageMedia } from "../../lib/layeredCanvas/dataModels/film";
  import { SortableList } from '@sonderbase/svelte-sortablejs';

  // import ListBox from "../../utils/listbox/ListBox.svelte";
  // import ListBoxItem from "../../utils/listbox/ListBoxItem.svelte";
  import FilmListItem from "./FilmListItem.svelte";

  export let filmStack: FilmStack;

  const dispatch = createEventDispatcher();

  let key = 0;

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
      key++;
    }
  }

  function moveFilm(oldIndex: number, newIndex: number) {
    console.log("moveFilm(before)", oldIndex, newIndex, filmStack.films.map(f => f.index));

    // reversed order
    oldIndex = filmStack.films.length - 1 - oldIndex;
    newIndex = filmStack.films.length - 1 - newIndex;
    
    if (oldIndex < newIndex) {
      const film = filmStack.films.splice(oldIndex, 1)[0];
      filmStack.films.splice(newIndex, 0, film);
    } else {
      const film = filmStack.films.splice(oldIndex, 1)[0];
      filmStack.films.splice(newIndex, 0, film);
    }
    console.log("moveFilm(after)", oldIndex, newIndex, filmStack.films.map(f => f.index));
  }

  async function onMoveFilm(e: CustomEvent<{ index: number, sourceIndex: number }>) {
    console.log(e.detail);
    let { index, sourceIndex } = e.detail;

    if (index < sourceIndex) {
      sourceIndex = filmStack.films.length - sourceIndex;
      index = filmStack.films.length - index;
      
      const film = filmStack.films.splice(sourceIndex, 1)[0];
      filmStack.films.splice(index, 0, film);
    } else {
      sourceIndex = filmStack.films.length - sourceIndex;
      index = filmStack.films.length - index;
      
      const film = filmStack.films.splice(sourceIndex, 1)[0];
      filmStack.films.splice(index + 1, 0, film);
    }
    dispatch('commit');
    key++;
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
    key++;
  }

  function onDeleteFilm(e: CustomEvent<Film>) {
    const film = e.detail;
    filmStack.films = filmStack.films.filter(f => f !== film);
    dispatch('commit');
    key++;
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
    moveFilm(e.oldIndex, e.newIndex);
    dispatch('commit');
    key++;
  }

</script>

{#key key}
<FilmListItem film={null} on:select={onGenerate}/>
<SortableList class="flex flex-col gap-2 mt-2" animation={100} onUpdate={onUpdate}>
  {#each filmStack.films.toReversed() as film}
    <FilmListItem film={film} on:select={onSelectFilm} on:delete={onDeleteFilm} on:scribble={onScribble} on:generate={onGenerate} on:punch={onPunch}/>
  {/each}
</SortableList>  
{/key}

<style>
  :global(.listbox) {
    gap: 16px;
  }
</style>