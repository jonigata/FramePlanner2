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
  import type { RichChatLog, RichChatDocument } from "../utils/richChat";
  import InlineDocument from "./InlineDocument.svelte";
  import { makePage } from "./storyboardServant";

  const debugTemplates = [
    "にゃん",
    "ぬるぽ",
    "FramePlannerって何？",
    "Feathralって何？",
  ];

  const chatTemplates = [
    "マンガ作って",
    "任せる",
    "いいね",
    "ネーム作って",
  ];

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

  function onAddDummyStoryboard() {
    console.log("dummy storyboarding")
    const s = `{"format":"4koma","characters":[{"name":"宮本さつき","appearance":"Athletic build, tanned skin, brown hair in a ponytail, wearing a baseball jersey and cap"},{"name":"鈴木なつみ","appearance":"Short stature, slightly chubby, short black hair, wearing a catcher's gear"},{"name":"高橋あかり","appearance":"Tall and slender, long straight black hair, wearing a baseball jersey and yoga pants"}],"pages":[{"panels":[{"composition":"A pitcher's mound in a tropical baseball stadium, with palm trees visible in the background. Satsuki, an athletic woman with tanned skin, brown hair in a ponytail, wearing a baseball jersey and cap, stands on the mound, looking determined but slightly nervous. Next to her, Natsumi, a short and slightly chubby woman with short black hair, wearing a catcher's gear, stands ready. In the outfield, Akari, a tall and slender woman with long straight black hair, wearing a baseball jersey and yoga pants, is positioned, ready to play.","camera":"from side","bubbles":[{"owner":"さつき","speech":"南国の地で、\\n全国制覇を\\n目指すのよ！"}]},{"composition":"A young woman with a ponytail and tanned skin, wearing a baseball jersey and cap, giving an encouraging thumbs-up to a short and slightly chubby woman in catcher's gear, from a low angle.","camera":"from below","bubbles":[{"owner":"なつみ","speech":"さつきなら\\nできるよ！\\n頑張ろう！"}]},{"composition":"Tall and slender woman with long straight black hair wearing a baseball jersey and yoga pants, practicing her batting alone on a baseball field with the sun setting in the distance, from the side.","camera":"from side","bubbles":[{"owner":"あかり","speech":"私も打撃を\\n上達させないと..."}]},{"composition":"Three athletic girls high-fiving on a baseball field, with teammates cheering in the background. One girl has an athletic build, tanned skin, and brown hair in a ponytail, wearing a baseball jersey and cap. Another girl has a short stature, slightly chubby build, short black hair, and is wearing catcher's gear. The third girl is tall and slender, with long straight black hair, wearing a baseball jersey and yoga pants. The scene is shot from above.","camera":"from above","bubbles":[{"owner":"さつき","speech":"一緒に\\n頑張ろうね！"}]}]},{"panels":[{"composition":"Athletic woman with tanned skin, brown hair in a ponytail, wearing a baseball jersey and cap, intensely pitching a ball, with a short, slightly chubby woman in catcher's gear ready to receive the pitch, dramatic angle.","camera":"dramatic angle","bubbles":[{"owner":"さつき","speech":"えいっ！\\nどうよ！"}]},{"composition":"A tanned, athletic woman with brown hair in a ponytail, wearing a baseball jersey and cap, missing the pitch of a short, slightly chubby woman wearing catcher's gear, with a shocked expression on her face, side view.","camera":"from side","bubbles":[{"owner":"ライバル","speech":"な、何てスピード\\nだ..."}]},{"composition":"A player with long, straight black hair wearing a baseball jersey and yoga pants stepping up to the plate, her teammates cheering from the dugout behind her. The catcher, a short and slightly chubby person with short black hair wearing catching gear, crouched down ready to receive the pitch. An athletic player with tanned skin, brown hair in a ponytail, and wearing a baseball jersey and cap, standing at the edge of the dugout watching intently.","camera":"from above","bubbles":[{"owner":"あかり","speech":"よし...\\n決めた！"}]},{"composition":"Three athletic girls in a baseball uniform celebrating their win, jumping up and down in a circle with confetti raining down, from a birds-eye-view shot.","camera":"birds-eye-view shot","bubbles":[{"owner":"なつみ","speech":"やったー！\\n優勝だぁ！"}]}]}]}`;
    const context: Context = {
      book: $mainBook,
      pageIndex: 0,
    }
    const storyboard = JSON.parse(s);
    makePage(context, storyboard);    
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
  <div class="flex flex-wrap gap-1 justify-center">
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button px-1 hbox" on:click={() => onReset()}>
      reset
    </button>
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button px-1 hbox" on:click={() => onRollback()}>
      rollback
    </button>
    {#each chatTemplates as sample}
      <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button px-1 hbox" on:click={() => onPost(sample)}>
        {sample}
      </button>
    {/each}
  </div>
  <DebugOnly>
    <div class="flex flex-wrap gap-1 justify-center">
      <div class="flex w-full gap-1 justify-center">
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onAddDummyLog(0)}>
          dummy1
        </button>
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onAddDummyLog(1)}>
          dummy2
        </button>
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onAddDummyLog(2)}>
          dummy3
        </button>
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onAddDummyStoryboard()}>
          storyboard
        </button>
      </div>
      {#each debugTemplates as sample}
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