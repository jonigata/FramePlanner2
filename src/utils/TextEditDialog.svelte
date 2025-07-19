<script lang="ts">
  import { modalStore, RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import { createPreference, createPreferenceStore } from '../preferences';
  import AutoSizeTextarea from '../notebook/AutoSizeTextarea.svelte';

  import MangaBlackPicture from '../assets/kontext/manga-black.webp';
  import MangaGrayPicture from '../assets/kontext/manga-gray.webp';
  import FeathralCost from './FeathralCost.svelte';
  import { _ } from 'svelte-i18n';

  let title: string;
  let imageSource: HTMLCanvasElement;

  const minHeight = 100;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  let canvasElement: HTMLCanvasElement;
  let prompt = '';
  let placeholder = $_('dialogs.textEdit.placeholder');

  type TextEditMode = 'kontext/pro' | 'kontext/max';
  let selectedModel: TextEditMode = 'kontext/pro';
  const pref = createPreference<TextEditMode>("imaging", "textEditMode");
  
  // プロンプト履歴
  const MAX_HISTORY_SIZE = 50;
  const promptHistoryStore = createPreferenceStore<string[]>("tweakUi", "textEditPromptHistory", []);
  let promptHistory: string[] = [];
  let historyIndex = -1;
  let temporaryPrompt = '';
  
  // 画像リスト用のサンプルデータ
  let imageList: Array<{id: string, url: string, name: string, prompt: string}> = [];

  onMount(async () => {
    const args = $modalStore[0]?.meta;
    console.log('TextEdit Dialog mounted, modal store:', args);
    selectedModel = await pref.getOrDefault('kontext/pro');
    
    // 履歴を購読
    promptHistoryStore.subscribe(value => {
      promptHistory = value;
    });

    if (args) {
      title = args.title;
      if (args.imageSource) {
        imageSource = args.imageSource;
        console.log('Image source:', imageSource);
        drawImageOnCanvas();
      } else {
        console.error('No image source in modal meta');
      }
    }
    
    // サンプル画像データを追加
    imageList = [
      { id: '1', url: MangaBlackPicture, name: $_('dialogs.textEdit.mangaBlack'), prompt: 'Convert to sharp monochrome contour line art, frontal lighting, flat discrete cel shading' },
      { id: '2', url: MangaGrayPicture, name: $_('dialogs.textEdit.mangaGray'), prompt: 'Convert to sharp monochrome contour line art, flat shading using gray' },
    ];
  });

  function drawImageOnCanvas() {
    if (!imageSource || !canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 画像のアスペクト比を保持してキャンバスに描画
    const imageAspect = imageSource.width / imageSource.height;
    const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imageAspect > canvasAspect) {
      // 画像が横長の場合
      drawWidth = CANVAS_WIDTH;
      drawHeight = CANVAS_WIDTH / imageAspect;
      drawX = 0;
      drawY = (CANVAS_HEIGHT - drawHeight) / 2;
    } else {
      // 画像が縦長の場合
      drawWidth = CANVAS_HEIGHT * imageAspect;
      drawHeight = CANVAS_HEIGHT;
      drawX = (CANVAS_WIDTH - drawWidth) / 2;
      drawY = 0;
    }
    
    ctx.drawImage(imageSource, drawX, drawY, drawWidth, drawHeight);
  }

  function onCancel() {
    modalStore.close();
  }
  
  function onImageSelect(selectedImage: {id: string, url: string, name: string, prompt: string}) {
    console.log('Selected image:', selectedImage);
    // 選択された画像のプロンプトをテキストエリアに設定
    prompt = selectedImage.prompt;
    // 履歴ナビゲーションをリセット
    historyIndex = -1;
    temporaryPrompt = '';
  }

  function onSubmit() {
    if (!imageSource || !prompt.trim()) return;

    // 履歴に追加
    addToHistory(prompt);

    $modalStore[0].response?.({
      image: imageSource,
      prompt: prompt,
      model: selectedModel,
    });

    modalStore.close();
  }
  
  function addToHistory(newPrompt: string) {
    if (!newPrompt.trim()) return;
    
    // 重複を削除
    const filteredHistory = promptHistory.filter(item => item !== newPrompt);
    
    // 新しいプロンプトを先頭に追加
    const newHistory = [newPrompt, ...filteredHistory];
    
    // 最大履歴数を超えた場合は古いものを削除
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.splice(MAX_HISTORY_SIZE);
    }
    
    promptHistoryStore.set(newHistory);
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    if (!event.ctrlKey) return;
    
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      navigateHistory('up');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      navigateHistory('down');
    }
  }
  
  function navigateHistory(direction: 'up' | 'down') {
    if (promptHistory.length === 0) return;
    
    // 初めて履歴をナビゲートする場合、現在のプロンプトを保存
    if (historyIndex === -1 && prompt.trim()) {
      temporaryPrompt = prompt;
    }
    
    if (direction === 'up') {
      if (historyIndex < promptHistory.length - 1) {
        historyIndex++;
        prompt = promptHistory[historyIndex];
      }
    } else {
      if (historyIndex > -1) {
        historyIndex--;
        if (historyIndex === -1) {
          prompt = temporaryPrompt;
        } else {
          prompt = promptHistory[historyIndex];
        }
      }
    }
  }
</script>

<div class="card p-4 shadow-xl">
  <header class="card-header">
    <h2>{title}</h2>
  </header>
  <section class="p-4">
    <div class="main-content-container">
      <div class="left-pane">
        <div class="canvas-container">
          <canvas
            bind:this={canvasElement}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            class="border border-surface-300 rounded"
          />
        </div>
      </div>
      <div class="right-pane">
        <div class="right-pane-content">
          <div class="setting-section">
            <h3>{$_('dialogs.textEdit.model')}</h3>
            <div class="flex flex-row items-center gap-4">
              <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
                <RadioItem bind:group={selectedModel} name="model" value={'kontext/pro'}><span class="radio-text">Pro</span></RadioItem>
                <RadioItem bind:group={selectedModel} name="model" value={'kontext/max'}><span class="radio-text">Max</span></RadioItem>
              </RadioGroup>
              <div class="feathral-cost-container">
                <FeathralCost cost={selectedModel == 'kontext/pro' ? 6 : 13}/>
              </div>
            </div>
          </div>
          
          <div class="setting-section">
            <h3>{$_('dialogs.textEdit.instructionTemplate')}</h3>
            <div class="image-list">
              {#each imageList as image (image.id)}
                <div class="image-item" on:click={() => onImageSelect(image)} on:keydown={(e) => e.key === 'Enter' && onImageSelect(image)} tabindex="0" role="button">
                  <img src={image.url} alt={image.name} class="image-thumbnail" />
                  <div class="image-name">{image.name}</div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <footer class="card-footer">
    <div class="footer-content">
      <div class="history-hint">{$_('dialogs.textEdit.historyHint')}</div>
      <div class="flex gap-2 items-end">
        <AutoSizeTextarea minHeight={minHeight} bind:value={prompt} placeholder={placeholder} on:keydown={handleKeyDown}/>
        <div class="flex gap-2">
          <button class="btn variant-ghost-surface" on:click={onCancel}>{$_('dialogs.cancel')}</button>
          <button class="btn variant-filled-primary" on:click={onSubmit} disabled={!prompt.trim()}>{$_('dialogs.execute')}</button>
        </div>
      </div>
    </div>
  </footer>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    margin-top: 16px;
  }
  
  .main-content-container {
    display: flex;
    gap: 16px;
    height: 600px;
  }
  
  .left-pane {
    flex: 2;
    display: flex;
    flex-direction: column;
  }
  
  .right-pane {
    flex: 1;
    min-width: 0;
    border-left: 1px solid rgb(var(--color-surface-300));
    padding-left: 16px;
    overflow-y: auto;
    max-height: 600px;
  }
  
  .right-pane-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .setting-section {
    margin-bottom: 24px;
  }
  
  .feathral-cost-container {
    width: 80px;
    display: flex;
    justify-content: center;
  }
  
  .right-pane h3 {
    font-family: '源暎エムゴ';
    font-size: 18px;
    margin: 0 0 8px 0;
    color: rgb(var(--color-primary-500));
  }
  
  .image-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .image-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 8px;
    background: rgb(var(--color-surface-50));
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .image-item:hover {
    background: rgb(var(--color-surface-100));
    border-color: rgb(var(--color-primary-400));
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .image-item:focus {
    outline: 2px solid rgb(var(--color-primary-500));
    outline-offset: 2px;
  }
  
  .image-thumbnail {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid rgb(var(--color-surface-300));
    flex-shrink: 0;
  }
  
  .image-name {
    font-size: 14px;
    font-weight: 500;
    color: rgb(var(--color-surface-700));
    text-align: center;
    width: 100%;
  }
  
  .canvas-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 1;
  }
  
  canvas {
    max-width: 100%;
    max-height: 100%;
  }
  
  .footer-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  
  .history-hint {
    font-size: 12px;
    color: rgb(var(--color-surface-500));
    padding-left: 4px;
  }
</style>