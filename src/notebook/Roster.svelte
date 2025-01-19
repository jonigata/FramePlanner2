<script lang="ts">
  import { rosterOpen, rosterSelectedCharacter } from "./rosterStore";
  import Drawer from "../utils/Drawer.svelte";
  import { onMount } from "svelte";
  import type { Character } from "$bookTypes/notebook";
  import { fileSystem } from "../filemanager/fileManagerStore";
  import { getNodeByPath, rm } from "../lib/filesystem/fileSystem";
  import trashIcon from '../assets/trash.png';

  let opened = false;
  let characters: Character[] = [];

  function onClickAway() {
    $rosterOpen = false;
  }

  function offer(c: Character) {
    console.log("offer");
    $rosterSelectedCharacter = c;
    $rosterOpen = false;
  }

  function remove(c: Character) {
    console.log("remove");
    characters = characters.filter((char) => char !== c);
    rm($fileSystem!, `AI/キャラクター/${c.ulid}`);
  }

  onMount(() => {
    return rosterOpen.subscribe(async (value) => {
      if (value) {
        if (!opened) {
          opened = true;
          const fs = $fileSystem!;
          const folder = (
            await getNodeByPath(fs, "AI/キャラクター")
          ).asFolder();
          const entries = await folder!.listEmbodied();
          characters = [];
          for (const entry of entries) {
            const content = await entry[2].asFile()!.read();
            const c = content as Character;
            if (c.portrait instanceof Blob) {
              c.portrait = {
                src: URL.createObjectURL(c.portrait),
                blob: c.portrait,
              };
            }

            characters.push(c);
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
                  {#if character.portrait}
                    <img src={character.portrait.src} alt="見た目"/>
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
