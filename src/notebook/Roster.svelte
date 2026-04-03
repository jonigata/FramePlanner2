<script lang="ts">
  import { loadCharactersFromRoster, loadCharacterPortraits, rosterOpen, rosterSelectedCharacter, saveCharacterToRoster, reorderRoster } from "./rosterStore";
  import Drawer from "../utils/Drawer.svelte";
  import { onMount } from "svelte";
  import type { CharacterLocal } from "../lib/book/book";
  import { gadgetFileSystem } from "../filemanager/fileManagerStore";
  import { rm } from "../lib/filesystem/fileSystem";
  import trashIcon from '../assets/trash.webp';
  import downloadIcon from '../assets/download.webp';
  import CharacterEditor from "./CharacterEditor.svelte";
  import { _ } from 'svelte-i18n';
  import { saveCharacterToFile, loadCharacterFromFile } from "./characterExport";
  import { toastStore, Accordion, AccordionItem } from "@skeletonlabs/skeleton";
  import { postToPublicActors } from "../materialBucket/materialOperations";
  import { onlineStatus } from "../utils/accountStore";
  import postIcon from '../assets/post.webp';
  import { sortableList } from "../utils/sortableList";
  import { moveInArray } from "../utils/moveInArray";
  import PublicActorsGallery from "../materialBucket/PublicActorsGallery.svelte";

  let saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function debouncedSave(character: CharacterLocal) {
    const existing = saveTimers.get(character.ulid);
    if (existing) clearTimeout(existing);
    saveTimers.set(character.ulid, setTimeout(async () => {
      saveTimers.delete(character.ulid);
      if ($gadgetFileSystem) {
        await saveCharacterToRoster($gadgetFileSystem, character);
      }
    }, 1000));
  }

  function onCharacterChange(character: CharacterLocal) {
    debouncedSave(character);
  }

  function onErasePortrait(e: CustomEvent<CharacterLocal>) {
    const character = e.detail;
    character.portrait = null;
    characters = characters;
    debouncedSave(character);
  }

  let opened = false;
  let characters: CharacterLocal[] = [];
  let localRosterOpen = true;
  let publicActorsOpen = false;

  // ダウンロード済みの役者IDリスト
  $: downloadedActorIds = characters.map(c => c.ulid);

  // みんなの役者からダウンロード完了時にローカルを再読み込み
  async function onActorDownloaded() {
    characters = await loadCharactersFromRoster($gadgetFileSystem!);
    loadCharacterPortraits($gadgetFileSystem!, characters, () => {
      characters = characters;
    });
  }
  
  async function onSortUpdate(e: { oldIndex: number | undefined; newIndex: number | undefined }) {
    if (e.oldIndex == null || e.newIndex == null) return;
    moveInArray(characters, e.oldIndex, e.newIndex);
    // UIのみの入れ替え（永続化はしない）
    characters = characters;
    // ファイルシステム上の順序も更新
    try {
      await reorderRoster($gadgetFileSystem!, e.oldIndex, e.newIndex);
    } catch (err) {
      console.error('Failed to persist roster order:', err);
    }
  }

  function onClickAway() {
    $rosterOpen = false;
  }

  function offer(c: CharacterLocal) {
    console.log("offer");
    $rosterSelectedCharacter = c;
    toastStore.trigger({ message: `「${c.name}」を採用しました`, timeout: 1500 });
  }

  function remove(c: CharacterLocal) {
    console.log("remove");
    characters = characters.filter((char) => char !== c);
    rm($gadgetFileSystem!, `AI/キャラクター/${c.ulid}`);
  }

  async function exportCharacter(c: CharacterLocal) {
    try {
      await saveCharacterToFile(c);
      toastStore.trigger({ message: `キャラクター「${c.name}」をエクスポートしました`, timeout: 3000 });
    } catch (error) {
      console.error('Failed to export character:', error);
      toastStore.trigger({ message: 'エクスポートに失敗しました', timeout: 3000 });
    }
  }

  async function importCharacter() {
    try {
      const character = await loadCharacterFromFile();
      if (character) {
        await saveCharacterToRoster($gadgetFileSystem!, character);
        characters = await loadCharactersFromRoster($gadgetFileSystem!);
        loadCharacterPortraits($gadgetFileSystem!, characters, () => {
          characters = characters;
        });
        toastStore.trigger({ message: `キャラクター「${character.name}」をインポートしました`, timeout: 3000 });
      }
    } catch (error) {
      console.error('Failed to import character:', error);
      toastStore.trigger({ message: 'インポートに失敗しました', timeout: 3000 });
    }
  }

  async function shareCharacter(c: CharacterLocal) {
    await postToPublicActors(c);
  }

  onMount(() => {
    return rosterOpen.subscribe(async (newOpened) => {
      if (newOpened) {
        publicActorsOpen = false;
        if (!opened) {
          opened = true;
          characters = await loadCharactersFromRoster($gadgetFileSystem!);
          // ポートレートをバックグラウンドで読み込み、読み込み完了ごとに反映
          loadCharacterPortraits($gadgetFileSystem!, characters, () => {
            characters = characters;
          });
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
      <div class="roster-header">
        <h2 class="roster-title">{$_('notebook.characterRoster')}</h2>
        <button class="import-btn" on:click={importCharacter}>
          キャラクターをインポート
        </button>
      </div>

      <Accordion>
        <AccordionItem bind:open={localRosterOpen}>
          <svelte:fragment slot="summary">
            <h3 class="accordion-title">{$_('publicActors.localActors')}</h3>
          </svelte:fragment>
          <svelte:fragment slot="content">
            <div
              class="character-list"
              use:sortableList={{
                animation: 150,
                handle: ".character-header",
                filter: ".header-buttons, .header-buttons *",
                preventOnFilter: false,
                fallbackOnBody: true,
                fallbackTolerance: 8,
                ghostClass: "sortable-ghost",
                chosenClass: "sortable-chosen",
                onUpdate: onSortUpdate
              }}
            >
              {#each characters as character (character.ulid)}
                <div class="character-card">
                  <div class="character-header" style="border-left: 4px solid {character.themeColor};" title="ドラッグして並べ替え">
                    <div class="character-name-container">
                      <span class="character-name">{character.name}</span>
                    </div>
                    <div class="header-buttons">
                      {#if $onlineStatus === 'signed-in' && character.portrait && character.portrait !== 'loading'}
                        <button class="share-btn" on:click={() => shareCharacter(character)} title={$_('publicActors.postButton')}>
                          <img src={postIcon} alt={$_('publicActors.postButton')} class="post-icon" />
                        </button>
                      {/if}
                      <button class="export-btn" on:click={() => exportCharacter(character)} title="エクスポート">
                        <img src={downloadIcon} alt="エクスポート" class="download-icon" />
                      </button>
                      <button class="delete-btn" on:click={() => remove(character)}>
                        <img src={trashIcon} alt={$_('notebook.delete')} class="trash-icon" />
                      </button>
                    </div>
                  </div>
                  <div class="character-content">
                    <CharacterEditor
                      bind:character={character}
                      showPortraitGeneration={false}
                      on:change={() => onCharacterChange(character)}
                      on:erasePortrait={onErasePortrait}
                    >
                      <svelte:fragment slot="belowPortrait">
                        <button class="offer-btn" on:click={() => offer(character)}>{$_('notebook.offer')}</button>
                      </svelte:fragment>
                    </CharacterEditor>
                  </div>
                </div>
              {/each}
            </div>
          </svelte:fragment>
        </AccordionItem>

        <AccordionItem bind:open={publicActorsOpen}>
          <svelte:fragment slot="summary">
            <h3 class="accordion-title">{$_('materialBucket.publicActors')}</h3>
          </svelte:fragment>
          <svelte:fragment slot="content">
            <div class="public-actors-container">
              <PublicActorsGallery
                columnWidth={160}
                downloadedActorIds={downloadedActorIds}
                onDownloaded={onActorDownloaded}
              />
            </div>
          </svelte:fragment>
        </AccordionItem>
      </Accordion>
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
  
  .roster-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid rgb(var(--color-primary-500));
  }
  
  .roster-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: rgb(var(--color-primary-700));
    margin: 0;
  }

  .accordion-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: rgb(var(--color-primary-600));
    margin: 0;
  }

  .public-actors-container {
    min-height: 300px;
    max-height: 500px;
    overflow-y: auto;
  }
  
  .import-btn {
    background-color: rgb(var(--color-primary-500));
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .import-btn:hover {
    background-color: rgb(var(--color-primary-600));
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
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
  }
  .character-header:active { cursor: grabbing; }
  .character-header *, .character-name { 
    user-select: none; 
    -webkit-user-select: none; 
  }
  
  /* 旧ハンドルは不要になったため削除 */
  
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

  .header-buttons {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .share-btn {
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s;
    padding: 4px;
  }

  .share-btn:hover {
    opacity: 1;
    background-color: rgba(128, 0, 255, 0.1);
    border-radius: 4px;
  }

  .post-icon {
    width: 20px;
    height: 20px;
  }

  .export-btn {
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s;
    padding: 4px;
  }

  .export-btn:hover {
    opacity: 1;
    background-color: rgba(0, 100, 255, 0.1);
    border-radius: 4px;
  }

  .download-icon {
    width: 20px;
    height: 20px;
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
  
  :global(.sortable-ghost) {
    opacity: 0.5;
  }
  :global(.sortable-chosen) {
    box-shadow: 0 0 0 2px rgba(0, 100, 255, 0.2) inset;
  }
  
  .character-content {
    padding: 1rem;
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
  
</style>
