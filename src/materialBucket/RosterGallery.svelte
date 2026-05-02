<script lang="ts">
  import { onMount } from 'svelte';
  import Gallery from '../gallery/Gallery.svelte';
  import { gadgetFileSystem } from '../filemanager/fileManagerStore';
  import { loadCharactersFromRoster, loadCharacterPortraits } from '../notebook/rosterStore';
  import type { CharacterLocal } from '../lib/book/book';
  import { buildMedia, type Media } from '../lib/layeredCanvas/dataModels/media';
  import { createEventDispatcher } from 'svelte';
  import type { GalleryItem } from "../gallery/gallery";

  export let columnWidth: number = 220;

  const dispatch = createEventDispatcher();
  let items: GalleryItem[] = [];
  let characterIds = new WeakMap<GalleryItem, string>();
  let loading = true;

  function onChildDragStart(e: CustomEvent<Media>) {
    dispatch('dragstart', e.detail);
  }

  async function displayRosterImages() {
    if (!$gadgetFileSystem) return;

    const characters = await loadCharactersFromRoster($gadgetFileSystem);

    const addedUlids = new Set<string>();

    const appendNewlyLoaded = () => {
      let added = false;
      for (const character of characters) {
        if (addedUlids.has(character.ulid)) continue;
        if (character.portrait && character.portrait !== 'loading') {
          const media = buildMedia(character.portrait.persistentSource);
          items.push(media);
          characterIds.set(media, character.ulid);
          addedUlids.add(character.ulid);
          added = true;
        }
      }
      if (added) {
        items = items;
      }
    };

    try {
      await loadCharacterPortraits($gadgetFileSystem, characters, appendNewlyLoaded);
      appendNewlyLoaded();
    } finally {
      loading = false;
    }
  }

  onMount(displayRosterImages);
</script>

<div class="gallery-content">
  {#if items.length > 0}
    <Gallery {columnWidth} referable={false} bind:items={items} on:dragstart={onChildDragStart}/>
  {:else if loading}
    <div class="empty-state">
      <p class="empty-message">読み込み中...</p>
    </div>
  {:else}
    <div class="empty-state">
      <p class="empty-message">役者が登録されていません</p>
    </div>
  {/if}
</div>

<style>
  .gallery-content {
    width: 100%;
    min-height: 200px;
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    width: 100%;
    height: 100%;
  }

  .empty-message {
    color: rgb(var(--color-surface-600));
    font-size: 16px;
    font-family: '源暎エムゴ';
    text-align: center;
    padding: 20px;
  }
</style>
