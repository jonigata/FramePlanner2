<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import NumberEdit from './NumberEdit.svelte';
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { FrameElement, calculatePhysicalLayout, collectLeaves, findLayoutOf, makeTrapezoidRect } from './lib/layeredCanvas/frameTree.js';
  import type { Page } from './pageStore';
  import { newPage, newBookToken } from "./fileManagerStore";
  import { aiTemplates } from './lib/layeredCanvas/frameExamples';
  import { Bubble } from './lib/layeredCanvas/bubble';
  import { measureVerticalText } from './lib/layeredCanvas/verticalText';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { generateStory, storyBoarding } from './prompts/storyGenerator'

  //let model = 'gpt-3.5-turbo';
  let apiKey = '';
  let model = 'gpt-4';
  let theme = 'おまかせ';
  let pageNumber = 1;
  let loading = false;

  async function generate() {
    loading = true;
    try {
      const story = await generateStory(apiKey, model, theme, pageNumber);
      const storyBoard = await storyBoarding(apiKey, model, story, pageNumber);

      const book = { title: theme, pages: [] };
      for (let i = 0; i < storyBoard.pages.length; i++) {
        console.log(storyBoard.pages[i]);
        const page = await createPage(storyBoard.pages[i]);
        book.pages.push(page);
      }
      $newBookToken = book;
    }
    catch (e) {
      toastStore.trigger({ message: `GPT エラー: ${e}`, timeout: 4000});
      console.log(e);
    }
    loading = false;
    modalStore.close();
  }

  async function createPage(source: any) {
    const page = newPage("ai-", 2);
    const n = source.scenes.length;
    page.frameTree = FrameElement.compile(aiTemplates[n - 2]); // ページ数に応じたテンプレ
    pourScenario(page, source);
    return page;
  }

  function pourScenario(page: Page, s: any) { // TODO: 型が雑
    const paperLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
    console.log(page.frameTree);
    const leaves = collectLeaves(page.frameTree);
    s.scenes.forEach((scene: any, index: number) => {
      const leaf = leaves[index];
      leaf.prompt = scene.description;

      const layout = findLayoutOf(paperLayout, leaf);
      const r = makeTrapezoidRect(layout.corners);
      const c = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
      const n = scene.bubbles.length;
      scene.bubbles.forEach((b:any, i:number) => {
        const bubble = new Bubble();
        bubble.text = b[1];
        bubble.embedded = true;
        bubble.initOptions();
        const cc = [r[0] + (r[2] - r[0]) * (n - i) / (n+1), (r[1] + r[3]) / 2];
        bubble.move(cc);
        calculateFitBubbleSize(bubble);
        page.bubbles.push(bubble);
      })
    });
  }

  function calculateFitBubbleSize(bubble: Bubble) {
    const baselineSkip = bubble.fontSize * 1.5;
    const charSkip = bubble.fontSize;
    let size =[0,0];
    const m = measureVerticalText(null, Infinity, bubble.text, baselineSkip, charSkip, false);
    size = [Math.floor(m.width*1.2), Math.floor(m.height*1.4)];
    bubble.size = size;
    bubble.forceEnoughSize();
  }

</script>

<div class="page-container">
  {#if loading}
    <div class="loading">
      <ProgressRadial/>
    </div>
  {:else}
    <fieldset>
      <div>
        <label for="openai-key">OpenAI Key</label>
        <input type="text" id="openai-key" name="openai-key" placeholder="OpenAI Key" bind:value={apiKey}/>
      </div>
      <div>
        <label for="model">GPT モデル</label>
        <div class="toggle" id="model">
          <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
            <RadioItem bind:group={model} name="justify" value={'gpt-3.5-turbo'}>GPT-3.5</RadioItem>
            <RadioItem bind:group={model} name="justify" value={'gpt-4'}>GPT-4</RadioItem>
          </RadioGroup>
        </div>
      </div>
      <div>
        <label for="theme">お題</label>
        <textarea id="theme" name="theme" placeholder="お題" bind:value={theme}/>
      </div>
      <div>
        <label for="page">ページ数</label>
        <div class="number-box" id="page">
          <NumberEdit bind:value={pageNumber}/>
        </div>
      </div>

      <div class="button-panel">
        <button class="button btn variant-filled-primary px-2 py-2" on:click={generate}>生成</button>
        <button class="button btn variant-filled-secondary px-2 py-2" on:click={() => modalStore.close()}>back</button>
      </div>
    </fieldset>
  {/if}
</div>

<style>
  .page-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  fieldset {
    background-color: #fff;
    width: 600px;
    height: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px;
    gap: 16px;
  }
  fieldset div {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
  }
  label {
    order: 1;
    width: 10em;
    padding-right: 0.5em;
  }
  input, textarea {
    order: 2;
    flex: 1 1 auto;
    border: 1px solid #ccc;
    padding: 4px;
  }  
  textarea {
    height: 100px;
  }
  .toggle {
    order: 2;
    flex: 1 1 auto;
    width: auto;
  }
  .number-box {
    order: 2;
    flex: 1 1 auto;
    border: 1px solid #ccc;
    width: auto;
    height: 32px;
  }
  .button-panel {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 16px;
  }
  .button {
    margin-top: 16px;
    bottom: 8px;
    right: 8px;
    z-index: 1;
    cursor: pointer;
    color: #fff;
    width: 160px;
  }
  .loading {
    width: 600px;
    height: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
</style>