<script lang="ts">
  import { onMount } from "svelte";
  import { fontLoadToken } from "../bookeditor/bookStore";
  import { chat } from "../firebase";
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import "../box.css";
  import { type Log, MascotController } from "./MascotController";

  const controller = new MascotController();
  let input = "";
  let key=0;
  let log: Log[] = controller.log;
  let timelineElement: HTMLDivElement;
  
  $: if (log && timelineElement) {
    console.log("scroll");
    console.log(timelineElement.scrollHeight);
    timelineElement.scrollTop = timelineElement.scrollHeight;
  }

  const handleKeydown = async (e) => {
    if (e.keyCode === 13) {
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      controller.add(
        (clog) => {
          log = clog;
          input=null;
          key++;
        },
        input);
    }
  };  

  function onReset() {
    console.log("onReset");
    controller.reset();
    log = controller.log;
    key++;
  }

  function onPost(content: string) {
    controller.add(
      (clog) => {
        log = clog;
        input=null;
        key++;
      },
      content);
  }
  
  onMount(() => {
    $fontLoadToken = [{family: "Kaisei Decol", weight: "400"}, {family: "源暎エムゴ", weight: "400"}];
  });
</script>

<div class="timeline-container variant-glass-surface rounded-container-token">
  <div class="timeline rounded-container-token vbox" bind:this={timelineElement}>
    {#key key}
      {#each log as { role, content }, i}
        {#if role === 'assistant'}
          {#if content === null}
          <div class="mascot variant-soft-primary rounded-container-token w-24 flex justify-center">
            <ProgressRadial width="w-4"/>
          </div>
          {:else}
            <div class="mascot variant-soft-primary rounded-container-token">{content}</div>
          {/if}
        {/if}
        {#if role === 'user'}
          <div class="user variant-soft-tertiary rounded-container-token">{content}</div>
        {/if}
      {/each}
    {/key}
  </div>
  <textarea class="chat rounded-container-token" rows="4" cols="50" on:keydown={handleKeydown} bind:value={input}/>
  <div class="hbox">
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={onReset}>
      Reset
    </button>
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onPost("お前を消す方法")}>
      お前を消す方法
    </button>
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onPost("フキダシを作るには？")}>
      フキダシを作るには？
    </button>
  </div>
</div>

<style>
  .timeline-container {
    position: absolute;
    left: 256px;
    bottom: 0;
  }
  .timeline {
    margin: 8px;
    width: 320px;
    height: 512px;
    background: rgba(var(--color-surface-50) / 1);
    white-space: pre-line;
    text-align: left;
    padding: 4px;
    gap: 2px;
    overflow-y: auto;
  }
  .chat {
    margin: 8px;
    padding: 4px;
    width: 95%;
    height: 50px;
    background: rgba(var(--color-surface-50) / 1);
    line-height: 1.3;
  }
  .user {
    color: var(--color-primary-50);
    font-family: '源暎エムゴ';
    max-width: 80%;
    word-wrap: break-word;
    padding: 6px;
    align-self: flex-end;
  }
  .mascot {
    color: var(--color-primary-50);
    font-family: 'Kaisei Decol';
    max-width: 80%;
    word-wrap: break-word;
    padding: 6px;
    align-self: flex-start;
  }
</style>