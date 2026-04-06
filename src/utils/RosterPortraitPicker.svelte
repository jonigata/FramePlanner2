<script lang="ts">
  import { onMount } from 'svelte';
  import { buildMedia, type Media } from '../lib/layeredCanvas/dataModels/media';
  import { gadgetFileSystem } from '../filemanager/fileManagerStore';
  import { loadCharactersFromRoster, loadCharacterPortraits } from '../notebook/rosterStore';
  import type { CharacterLocal } from '../lib/book/book';
  import MediaFrame from '../gallery/MediaFrame.svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ pick: Media }>();

  let characters: CharacterLocal[] = [];

  onMount(async () => {
    const fs = $gadgetFileSystem;
    if (!fs) return;
    characters = await loadCharactersFromRoster(fs);
    loadCharacterPortraits(fs, characters, () => {
      characters = characters;
    });
  });

  function onClick(character: CharacterLocal) {
    if (!character.portrait || character.portrait === 'loading') return;
    const media = buildMedia(character.portrait.persistentSource);
    dispatch('pick', media);
  }
</script>

{#if characters.length > 0}
  <div class="roster-picker">
    <div class="roster-grid">
      {#each characters as character (character.ulid)}
        {@const portrait = character.portrait !== 'loading' ? character.portrait : null}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="roster-cell"
          class:disabled={!portrait}
          on:click={() => onClick(character)}
        >
          <div class="roster-portrait" style="border-color: {character.themeColor};">
            {#if portrait}
              <MediaFrame media={portrait} />
            {:else}
              <div class="no-portrait">-</div>
            {/if}
          </div>
          <div class="roster-name">{character.name}</div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .roster-picker {
    display: flex;
    flex-direction: column;
  }

  .roster-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 6px;
  }

  .roster-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    padding: 3px;
    border-radius: 4px;
    transition: background-color 0.15s;
  }

  .roster-cell:hover:not(.disabled) {
    background-color: rgba(var(--color-primary-500), 0.1);
  }

  .roster-cell:active:not(.disabled) {
    background-color: rgba(var(--color-primary-500), 0.2);
  }

  .roster-cell.disabled {
    cursor: default;
    opacity: 0.3;
  }

  .roster-portrait {
    width: 56px;
    height: 56px;
    border: 2px solid;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgb(var(--color-surface-100));
  }

  .roster-name {
    font-size: 10px;
    font-weight: 600;
    text-align: center;
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgb(var(--color-surface-700));
  }

  .no-portrait {
    font-size: 12px;
    color: rgb(var(--color-surface-400));
  }
</style>
