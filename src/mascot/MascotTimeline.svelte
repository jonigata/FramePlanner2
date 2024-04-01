<script lang="ts">
  import { onMount } from "svelte";
  import { fontLoadToken, mainBook } from "../bookeditor/bookStore";
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import "../box.css";
  import { type Context, type Log, MascotController } from "./MascotController";
  import { commitBook } from '../bookeditor/book';
  import Feathral from '../utils/Feathral.svelte';
  import { onlineAccount } from "../utils/accountStore";
  import DebugOnly from "../utils/DebugOnly.svelte";

  const debugSamples = [
    "にゃん",
    "ぬるぽ",
    "FramePlannerって何？",
    "Feathralって何？",
    "ネーム作って",
  ]

  const controller = new MascotController();
  let input = "";
  let key=0;
  let log: Log[] = controller.log;
  let timelineElement: HTMLDivElement;

  $: onLogChanged(log);
  function onLogChanged(log: Log[]) {
    if (timelineElement == null) { return; }
    setTimeout(() => {
      timelineElement.scrollTop = timelineElement.scrollHeight;
    }, 0); // 0ミリ秒の遅延で即時に実行されるが、DOMの更新を待つのに十分
  }

  const handleKeydown = (e) => {
    if (e.keyCode === 13) {
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      onPost(input);
    }
  };  

  function onReset() {
    controller.reset();
    log = controller.log;
    key++;
  }

  async function onPost(content: string) {
    const context: Context = {
      book: $mainBook,
      pageIndex: 0,
    }
    try {
      const feathral = await controller.add(
        (clog) => {
          log = clog;
          input=null;
          key++;
        },
        content,
        context);
      $onlineAccount.feathral = feathral;
      commitBook($mainBook, null);
      $mainBook = $mainBook;
      input = null;
      key++;
    }
    catch(e) {
      if (e.name === "AIError" || e.name === "AIArgumentError") {
        log.length = log.length - 1;
        log.push({role: "error", content: e.message});
        input=null;
        key++;
      } else {
        console.error(e.message);
      }
    }
  }
  
  onMount(() => {
    $fontLoadToken = [{family: "Kaisei Decol", weight: "400"}, {family: "源暎エムゴ", weight: "400"}];
  });
</script>

<div class="timeline-container variant-glass-surface rounded-container-token">
  <div class="timeline rounded-container-token vbox" bind:this={timelineElement}>
    <div class="mascot variant-soft-primary rounded-container-token">
      やってほしいことを教えてね～　多分すぐにはできないけど、そのうちできるようになるよ～
    </div>
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
        {#if role === 'error'}
          <div class="error variant-soft-error rounded-container-token">{content}</div>
        {/if}
      {/each}
    {/key}
  </div>
  <textarea class="chat rounded-container-token" rows="4" cols="50" on:keydown={handleKeydown} bind:value={input}/>
  <DebugOnly>
    <div class="flex flex-wrap gap-1 justify-center">
      <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onReset()}>
        reset
      </button>
      {#each debugSamples as sample}
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onPost(sample)}>
          {sample}
        </button>
      {/each}
    </div>
  </DebugOnly>
  <Feathral/>
</div>

<style>
  .timeline-container {
    position: absolute;
    left: 256px;
    bottom: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 4px;
  }
  .timeline {
    margin: 8px;
    margin-bottom: 0px;
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
  .error {
    color: var(--color-error-50);
    font-family: 'Zen Maru Gothic';
    max-width: 100%;
    word-wrap: break-word;
    padding: 6px;
    align-self: flex-start;
  }
</style>