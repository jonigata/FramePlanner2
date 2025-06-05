<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { mainBook, viewport, redrawToken } from '../bookeditor/workspaceStore';
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import Drawer from '../utils/Drawer.svelte'
  import { controlPanelOpen } from './controlPanelStore';
  import ExponentialSliderEdit from '../utils/ExponentialSliderEdit.svelte';
  import SliderEdit from '../utils/SliderEdit.svelte';
  import type { Book } from '../lib/book/book';
  import { _ } from 'svelte-i18n';

  let min = 256;
  let exponentialMin = 4096;
  let max = 9410;

  const scale = writableDerived(
  	viewport,
  	(v) => v?.scale! * 100,
  	(s, v) => {
      if (v) {
        v.scale = s! / 100;
        v.dirty = true;
        $redrawToken = true;
      }
      return v;
    }
  );

  const paperWidth = writableDerived(
    mainBook,
    (b) => b?.newPageProperty.paperSize[0]!,
    (s, b) => {
      if (b) {
        b.newPageProperty.paperSize[0] = s!;
      }
      return b;
    }
  );

  const paperHeight = writableDerived(
    mainBook,
    (b) => b?.newPageProperty.paperSize[1]!,
    (s, b) => {
      if (b) {
        b.newPageProperty.paperSize[1] = s!;
      }
      return b;
    }
  );

  let scalePercent = $scale * 100;
  scale.subscribe((v) => scalePercent = v * 100);
  $: $scale = scalePercent / 100;

  $: book = $mainBook!;

  function setDimensions(w: number, h: number) {
    // 入れ物ごと交換するとbindが崩れる模様
    const p = $mainBook!.newPageProperty;
    p.paperSize[0] = w;
    p.paperSize[1] = h;
    $mainBook!.newPageProperty = p;
  }

  $: onBookChanged(book);
  function onBookChanged(b: Book) {
    $mainBook = b;
  }

</script>

<div class="drawer-outer">
  <Drawer placement="left" open={$controlPanelOpen} size="350px" on:clickAway={() => $controlPanelOpen = false}>
    <div class="drawer-content">
      <details open>
        <summary>{$_('editor.paperSize')}</summary>
        <div class="section">
          <h2>{$_('editor.custom')}</h2>
          <ExponentialSliderEdit label="W" labelWidth={"20px"} bind:value={$paperWidth} min={min} max={max} exponentialMin={exponentialMin} exponentialRegion={1000} powPerStep={0.0001} step={1}/>
          <ExponentialSliderEdit label="H" labelWidth={"20px"} bind:value={$paperHeight} min={min} max={max} exponentialMin={exponentialMin} exponentialRegion={1000} powPerStep={0.0001} step={1}/>
          <h2>{$_('editor.square')}</h2>
          <div class="hbox gap-0.5">
            <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1024, 1024)}>S2</button>
            <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(512, 512)}>S1</button>
          </div>
          <h2>{$_('editor.portrait')}</h2>
          <div class="hbox gap-0.5">
            <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1680, 2376)}>A3</button>
            <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1456, 2056)}>B4</button>
            <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(840, 1188)}>A4</button>
            <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(728, 1028)}>B5</button>
          </div>
          <h2>{$_('editor.landscape')}</h2>
          <div class="hbox gap-0.5">
            <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(2376, 1680)}>A3</button>
            <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(2056, 1456)}>B4</button>
            <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1188, 840)}>A4</button>
            <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1028, 728)}>B5</button>
          </div>
        </div>
      </details>

      <details open>
        <summary>{$_('editor.directionAndWrap')}</summary>
        <div class="section">
          <h2>{$_('editor.direction')}</h2>
          <div class="radio-box hbox">
            <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
              <RadioItem bind:group={book.direction} name="direction" value={'right-to-left'}><span class="radio-text">◀</span></RadioItem>
              <RadioItem bind:group={book.direction} name="direction" value={'left-to-right'}><span class="radio-text">▶</span></RadioItem>
            </RadioGroup>
          </div>
          <h2>{$_('editor.wrap')}</h2>
          <div class="radio-box hbox">
            <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
              <RadioItem bind:group={book.wrapMode} name="wrap-mode" value={'none'}><span class="radio-text">{$_('editor.none')}</span></RadioItem>
              <RadioItem bind:group={book.wrapMode} name="wrap-mode" value={'two-pages'}><span class="radio-text">2p</span></RadioItem>
              <RadioItem bind:group={book.wrapMode} name="wrap-omde" value={'one-page'}><span class="radio-text">1p</span></RadioItem>
            </RadioGroup>
          </div>
        </div>
      </details>

      <details open>
        <summary>{$_('editor.scale')}</summary>
        <div class="section">
          <div class="flex flex-row w-full gap-1 items-center">
            <SliderEdit bind:value={$scale} min={10} max={400} step={1}/>％
          </div>
          <button class="btn btn-sm variant-filled paper-size" on:click={() => $scale=100}>100%</button>
        </div>
      </details>
    </div>
  </Drawer>
</div>

<style>
  .drawer-content {
    width: 350px;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 2px;
    overflow-x: hidden;
    overflow-y: auto;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  summary {
    font-family: '源暎エムゴ';
    font-size: 18px;
    margin-bottom: 8px;
  }
  .section {
    margin-left: 32px;
    margin-right: 16px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 4px;
  }
  h2 {
    font-family: '源暎エムゴ';
    font-size: 16px;
    line-height: normal;
    margin-left: -16px;
  }
  .paper-size {
    height: 20px;
  }
  .radio-text {
    height: 10px;
  }
  .radio-box {
    height: 35px;
  }
  .radio-box :global(.radio-item) {
    padding-top: 0px;
    padding-bottom: 0px;
    padding-left: 10px;
    padding-right: 10px;
  }
</style>