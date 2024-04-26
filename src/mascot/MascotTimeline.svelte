<script lang="ts">
  import { onMount } from "svelte";
  import { fontLoadToken, mainBook } from "../bookeditor/bookStore";
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import "../box.css";
  import { type Context, MascotController } from "./MascotController";
  import { commitBook } from '../bookeditor/book';
  import Feathral from '../utils/Feathral.svelte';
  import { onlineAccount } from "../utils/accountStore";
  import DebugOnly from "../utils/DebugOnly.svelte";
  import type { ProtocolChatLog, RichChatLog, RichChatDocument } from "../utils/richChat";
  import { protocolChatLogToRichChatLog, rollback } from "../utils/richChat";
  import InlineDocument from "./InlineDocument.svelte";

  const debugSamples = [
    "にゃん",
    "ぬるぽ",
    "FramePlannerって何？",
    "Feathralって何？",
    "ネーム作って",
    "任せる",
    "いいね",
    "4コマ漫画で連載するね。第一話のネームを考えてください。性格はなんJ民だけど、セリフはふつうにしてね",
  ]

  const controller = new MascotController($mainBook.chatLogs);
  let userInput = "";
  let key=0;
  let logs: RichChatLog[] = controller.logs;
  let timelineElement: HTMLDivElement;

  $: onLogsChanged(logs);
  function onLogsChanged(logs: RichChatLog[]) {
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
      onPost(userInput);
    }
  };  

  function onReset() {
    controller.reset();
    logs = controller.logs;
    key++;
  }

  function onRollback() {
    controller.rollback();
    logs = controller.logs;
    key++;
  }

  function onUpdateDocument(e: CustomEvent<RichChatDocument>) {
    console.log("document updated");
  }

  function onAddDummyLog(n) {
    controller.addDummyLog(n);
    logs = controller.logs;
    $mainBook.chatLogs = controller.logs;
    commitBook($mainBook, null);
    $mainBook = $mainBook;
    key++;
  }

  async function onPost(input: string) {
    const context: Context = {
      book: $mainBook,
      pageIndex: 0,
    }
    try {
      controller.addUserLog({role: 'user', content: {type: 'speech', body: input}});
      userInput = '';
      const feathral = await controller.addAssistantLog(
        (clog) => {
          logs = clog;
          key++;
        },
        context);
      $onlineAccount.feathral = feathral;
      $mainBook.chatLogs = controller.logs;
      commitBook($mainBook, null);
      $mainBook = $mainBook;
      key++;
    }
    catch(e) {
      console.log(e.message);
      logs.length = logs.length - 1;
      logs.push({role: "error", content: { type: 'error', body: "エラーになりました"}});
      key++;
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
      {#each logs as { role, content }, i}
        {#if content === null}
          <div class="mascot variant-soft-primary rounded-container-token w-24 flex justify-center">
            <ProgressRadial width="w-4"/>
          </div>
        {:else if content.type === 'document'}
          <InlineDocument document={content.body} on:input={onUpdateDocument}/>
        {:else if role === 'assistant'}
          {#if content === null}
          <div class="mascot variant-soft-primary rounded-container-token w-24 flex justify-center">
            <ProgressRadial width="w-4"/>
          </div>
          {:else}
            <div class="mascot variant-soft-primary rounded-container-token">{content.body}</div>
          {/if}
        {/if}
        {#if role === 'user'}
          <div class="user variant-soft-tertiary rounded-container-token">{content.body}</div>
        {/if}
        {#if role === 'error'}
          <div class="error variant-soft-error rounded-container-token">{content.body}</div>
        {/if}
      {/each}
    {/key}
  </div>
  <textarea class="chat rounded-container-token" rows="4" cols="50" on:keydown={handleKeydown} bind:value={userInput}/>
  <DebugOnly>
    <div class="flex flex-wrap gap-1 justify-center">
      <div class="flex w-full gap-1 justify-center">
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onReset()}>
          reset
        </button>
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onRollback()}>
          rollback
        </button>
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onAddDummyLog(0)}>
          dummy1
        </button>
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onAddDummyLog(1)}>
          dummy2
        </button>
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onAddDummyLog(2)}>
          dummy3
        </button>
      </div>
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
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    width: 100%;
    height: 100%;
  }
  .timeline {
    box-sizing: border-box;
    width: 100%;
    background: rgba(var(--color-surface-50) / 1);
    white-space: pre-line;
    text-align: left;
    padding: 4px;
    gap: 4px;
    overflow-y: auto;
    flex-grow: 1;
  }
  .chat {
    box-sizing: border-box;
    margin-top: 8px;
    padding: 8px;
    width: 100%;
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