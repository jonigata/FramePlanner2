<script lang="ts">
  import { loadCharactersFromRoster, rosterOpen, rosterSelectedCharacter } from "./rosterStore";
  import Drawer from "../utils/Drawer.svelte";
  import { onMount } from "svelte";
  import type { CharacterBase } from "../lib/book/types/notebook";
  import type { CharacterLocal } from "../lib/book/book";
  import { fileSystem } from "../filemanager/fileManagerStore";
  import { rm } from "../lib/filesystem/fileSystem";
  import trashIcon from '../assets/trash.webp';
  import MediaFrame from "../gallery/MediaFrame.svelte";

  interface CharacterInRoster extends CharacterBase {
    ulid: string;
    portrait: Blob | null;
  }

  let opened = false;
  let characters: CharacterLocal[] = [];

  function onClickAway() {
    $rosterOpen = false;
  }

  function offer(c: CharacterLocal) {
    console.log("offer");
    $rosterSelectedCharacter = c;
    $rosterOpen = false;
  }

  function remove(c: CharacterLocal) {
    console.log("remove");
    characters = characters.filter((char) => char !== c);
    rm($fileSystem!, `AI/キャラクター/${c.ulid}`);
  }

  onMount(() => {
    return rosterOpen.subscribe(async (newOpened) => {
      if (newOpened) {
        if (!opened) {
          opened = true;
          characters = await loadCharactersFromRoster($fileSystem!);
        }
      } else {
        opened = false;
      }
    });
  });
</script>

<div class="drawer-outer">
  <Drawer
    placement="left"
    open={$rosterOpen}
    size="600px"
    on:clickAway={onClickAway}
  >
    <div class="drawer-content">
      <h2 class="roster-title">キャラクター名簿</h2>
      <div class="character-list">
        {#each characters as character (character.ulid)}
          <div class="character-card">
            <div class="character-header" style="border-left: 4px solid {character.themeColor};">
              <div class="character-name-container">
                <span class="character-name">{character.name}</span>
                <div
                  class="color-display"
                  style="background-color: {character.themeColor};"
                ></div>
              </div>
              <button class="delete-btn" on:click={() => remove(character)}>
                <img src={trashIcon} alt="削除" class="trash-icon" />
              </button>
            </div>
            <div class="character-content">
              <div class="portrait-container">
                <div class="portrait">
                  {#if character.portrait && character.portrait != 'loading'}
                    <MediaFrame
                      media={character.portrait}
                    />
                  {:else}
                    <div class="no-portrait">容姿未登録</div>
                  {/if}
                </div>
                <button class="offer-btn" on:click={() => offer(character)}>オファー</button>
              </div>
              <div class="character-details">
                <div class="detail-section">
                  <div class="detail-label">性格</div>
                  <div class="textarea-display">{character.personality}</div>
                </div>
                <div class="detail-section">
                  <div class="detail-label">外見</div>
                  <div class="textarea-display">{character.appearance}</div>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </Drawer>
</div>

<style>
  .drawer-content {
    width: 100%;
    height: 100%;
    padding: 16px;
    overflow-y: auto;
    background-color: rgb(var(--color-surface-50));
  }
  
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-50));
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  }
  
  .roster-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid rgb(var(--color-primary-500));
    color: rgb(var(--color-primary-700));
  }
  
  .character-list {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  
  .character-card {
    background-color: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .character-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .character-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background-color: rgb(var(--color-surface-200));
    border-bottom: 1px solid rgb(var(--color-surface-300));
  }
  
  .character-name-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .character-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: rgb(var(--color-primary-700));
  }
  
  .color-display {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  }
  
  .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s;
    padding: 4px;
  }
  
  .delete-btn:hover {
    opacity: 1;
    background-color: rgba(255, 0, 0, 0.1);
    border-radius: 4px;
  }
  
  .trash-icon {
    width: 20px;
    height: 20px;
  }
  
  .character-content {
    display: flex;
    padding: 1rem;
    gap: 1rem;
  }
  
  .portrait-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }
  
  .portrait {
    width: 144px;
    height: 144px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid rgb(var(--color-surface-300));
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgb(var(--color-surface-100));
  }
  
  .no-portrait {
    color: rgb(var(--color-surface-700));
    font-size: 0.9rem;
  }
  
  .offer-btn {
    background-color: rgb(var(--color-secondary-500));
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.4rem 1rem;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    width: 100%;
  }
  
  .offer-btn:hover {
    background-color: rgb(var(--color-secondary-600));
  }
  
  .character-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .detail-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: rgb(var(--color-surface-700));
  }
  
  .textarea-display {
    min-height: 24px;
    padding: 0.5rem;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 4px;
    white-space: pre-wrap;
    background-color: rgb(var(--color-surface-50));
    font-size: 0.9rem;
    line-height: 1.4;
    flex: 1;
    overflow-y: auto;
    max-height: 120px;
  }
</style>
