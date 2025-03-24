<script lang="ts">
  import { rosterOpen, rosterSelectedCharacter } from "./rosterStore";
  import Drawer from "../utils/Drawer.svelte";
  import { onMount } from "svelte";
  import type { CharacterBase } from "../lib/book/types/notebook";
  import type { CharacterLocal } from "../lib/book/book";
  import { fileSystem } from "../filemanager/fileManagerStore";
  import { getNodeByPath, rm } from "../lib/filesystem/fileSystem";
  import trashIcon from '../assets/trash.webp';
  import { createCanvasFromBlob } from "../lib/layeredCanvas/tools/imageUtil";
  import { buildNullableMedia } from "../lib/layeredCanvas/dataModels/media";
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
          const fs = $fileSystem!;
          const folder = (
            await getNodeByPath(fs, "AI/キャラクター")
          ).asFolder();
          const entries = await folder!.listEmbodied();
          characters = [];
          for (const entry of entries) {
            const c = await entry[2].asFile()!.read() as CharacterInRoster;
            const portrait = c.portrait ? await createCanvasFromBlob(c.portrait) : null;
            characters.push({
              ...c,
              portrait: buildNullableMedia(portrait)
            });
          }
          characters = characters;
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
      {#each characters as character (character.ulid)}
        <div class="character">
          <div class="flex flex-col">
            <div class="flex flex-row gap-4 items-center mb-2">
              <span class="character-name">{character.name}</span>
              <div class="color-label">
                <div
                  class="color-display"
                  style="background-color: {character.themeColor};"
                ></div>
              </div>
              <div class="flex-grow"></div>
              <button on:click={() => remove(character)}>
                <img src={trashIcon} alt="bell" class="bell-icon" />
              </button>
            </div>
            <div class="flex flex-row gap-1">
              <div class="flex flex-col gap-2">
                <div class="portrait flex justify-center items-center">
                  {#if character.portrait && character.portrait != 'loading'}
                    <MediaFrame 
                      media={character.portrait}
                    />
                  {:else}
                    容姿未登録
                  {/if}
                </div>
                <button class="btn btn-sm bg-secondary-400" on:click={() => offer(character)}>オファー</button>
              </div>
              <div class="flex flex-col flex-grow gap-2">
                <div class="textarea-display">{character.personality}</div>
                <div class="textarea-display">{character.appearance}</div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </Drawer>
</div>

<style>
  .portrait {
    width: 144px;
    height: 144px;
    border-width: 1px;
    border-style: solid;
    border-color: black;
    position: relative;
  }
  .drawer-content {
    width: 100%;
    height: 100%;
    padding: 16px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .color-display {
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }
  .textarea-display {
    min-height: 24px;
    padding: 4px;
    border: 1px solid #111;
    border-radius: 4px;
    white-space: pre-wrap;
  }
  .bell-icon {
    width: 24px;
    height: 24px;
  }
</style>
