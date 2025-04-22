<script lang="ts">
  import { onMount } from 'svelte';
  import { modalStore } from '@skeletonlabs/skeleton';

  let source: HTMLCanvasElement;
  let canvas: HTMLCanvasElement;

  $: if (canvas) {
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    ctx!.drawImage(source, 0, 0);
  }

  onMount(() => {
    console.log($modalStore[0].meta);
    source = $modalStore[0].meta.canvas;
  });

  function submit() {
    $modalStore[0].response!(null);
    modalStore.close();
  }
</script>

<div class="page-container">
  <div class="media-container flex flex-col">
    <canvas bind:this={canvas}/>
    <button type="submit" class="btn variant-filled-primary" on:click={submit}>
      ok
    </button>
</div>

</div>

<style>
  .page-container {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }
  .media-container {
    width: 80svw;
    height: 80svh;
  }
</style>