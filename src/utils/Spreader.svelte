<script>
  import { onMount, onDestroy, tick } from 'svelte';

  let container; // コンポーネント自体の要素
  let parent; // 親要素を動的に検出
  let width = 0;
  let height = 0;

  // 親要素のサイズ変更を監視するResizeObserver
  let resizeObserver;

  onMount(() => {
    parent = container.parentNode; // 親要素を自動で検出
    resizeObserver = new ResizeObserver(async (entries) => {
      await tick();
      for (let entry of entries) {
        width = entry.contentRect.width;
        height = entry.contentRect.height;
      }
      console.log("resize", width, height);
    });
    
    // 親要素に対してResizeObserverを設定
    resizeObserver.observe(parent);
  });

  onDestroy(() => {
    resizeObserver.disconnect();
  });
</script>

<div bind:this={container} style="width: {width}px; height: {height}px;">
  <!-- ここに子要素など、他の内容を追加 -->
  <slot/>
</div>
