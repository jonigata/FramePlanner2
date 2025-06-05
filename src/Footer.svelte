<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  
  let containerRef;
  let visibleCount = 4;
  
  // 広告データ配列 - 追加・削除が簡単
  const originalAds = [
    `<a href="https://px.a8.net/svt/ejp?a8mat=4579SE+C7DX82+2PEO+OC77L" rel="nofollow">
    <img border="0" width="250" height="250" alt="" src="https://www25.a8.net/svt/bgt?aid=250602062738&wid=001&eno=01&mid=s00000012624004088000&mc=1"></a>
    <img border="0" width="1" height="1" src="https://www15.a8.net/0.gif?a8mat=4579SE+C7DX82+2PEO+OC77L" alt="">`,
    
    `<a href="https://px.a8.net/svt/ejp?a8mat=4579SE+DB9YR6+5FAA+5YZ75" rel="nofollow">
    <img border="0" width="300" height="250" alt="" src="https://www23.a8.net/svt/bgt?aid=250602062805&wid=001&eno=01&mid=s00000025309001003000&mc=1"></a>
    <img border="0" width="1" height="1" src="https://www13.a8.net/0.gif?a8mat=4579SE+DB9YR6+5FAA+5YZ75" alt="">`,
    
    `<a href="https://px.a8.net/svt/ejp?a8mat=4579SE+DDNP6A+8GQ+I6KTD" rel="nofollow">
    <img border="0" width="300" height="250" alt="" src="https://www22.a8.net/svt/bgt?aid=250602062809&wid=001&eno=01&mid=s00000001097003054000&mc=1"></a>
    <img border="0" width="1" height="1" src="https://www11.a8.net/0.gif?a8mat=4579SE+DDNP6A+8GQ+I6KTD" alt="">`,
    
    `<a href="https://px.a8.net/svt/ejp?a8mat=4579SE+DG1FLE+4RNG+60OXD" rel="nofollow">
    <img border="0" width="300" height="250" alt="" src="https://www26.a8.net/svt/bgt?aid=250602062813&wid=001&eno=01&mid=s00000022246001011000&mc=1"></a>
    <img border="0" width="1" height="1" src="https://www17.a8.net/0.gif?a8mat=4579SE+DG1FLE+4RNG+60OXD" alt="">`,

    `<a href="https://px.a8.net/svt/ejp?a8mat=4579SE+DFFZZM+41ZK+656YP" rel="nofollow">
    <img border="0" width="300" height="250" alt="" src="https://www27.a8.net/svt/bgt?aid=250602062812&wid=001&eno=01&mid=s00000018920001032000&mc=1"></a>
    <img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=4579SE+DFFZZM+41ZK+656YP" alt="">`,
  ];
  
  // シャッフルされた広告配列
  let ads = [];
  let measuredWidths = [];
  
  // Fisher-Yates シャッフルアルゴリズム
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  onMount(() => {
    // 広告をシャッフル
    ads = shuffleArray(originalAds);
    
    // 実際の幅を測定する関数
    const measureAdWidths = () => {
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.visibility = 'hidden';
      tempContainer.style.top = '-9999px';
      tempContainer.className = 'gap-8 flex flex-row items-center justify-center';
      document.body.appendChild(tempContainer);
      
      measuredWidths = [];
      
      ads.forEach((adContent) => {
        const adDiv = document.createElement('div');
        adDiv.className = 'ad';
        adDiv.innerHTML = adContent;
        tempContainer.appendChild(adDiv);
        
        // 画像の読み込み完了を待つ
        const images = adDiv.querySelectorAll('img');
        let loadedImages = 0;
        
        const checkComplete = () => {
          loadedImages++;
          if (loadedImages === images.length) {
            measuredWidths.push(adDiv.offsetWidth);
            if (measuredWidths.length === ads.length) {
              document.body.removeChild(tempContainer);
              updateVisibleAds();
            }
          }
        };
        
        images.forEach(img => {
          if (img.complete) {
            checkComplete();
          } else {
            img.onload = checkComplete;
            img.onerror = checkComplete;
          }
        });
      });
    };
    
    const updateVisibleAds = () => {
      if (!containerRef || measuredWidths.length === 0) return;
      
      const containerWidth = containerRef.clientWidth;
      const gap = 32; // gap-8 = 2rem = 32px
      const padding = 32; // pl-4 pr-2 pt-2 pb-2 の余裕
      const availableWidth = containerWidth - padding;
      
      let totalWidth = 0;
      let count = 0;
      
      for (let i = 0; i < measuredWidths.length; i++) {
        const adWidth = measuredWidths[i] + (i > 0 ? gap : 0);
        if (totalWidth + adWidth <= availableWidth) {
          totalWidth += adWidth;
          count++;
        } else {
          break;
        }
      }
      
      visibleCount = Math.max(1, count);
    };
    
    // 初期測定
    measureAdWidths();
    
    // リサイズ監視
    const resizeObserver = new ResizeObserver(updateVisibleAds);
    if (containerRef) {
      resizeObserver.observe(containerRef);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  });
</script>

<div class="w-screen bg-surface-900 pl-4 pr-2 pt-2 pb-2">
  <div class="text-center text-white mb-2">
    <!-- ここに1行文を入力してください -->
    <a href="https://frameplanner.manga-farm.online" target="_blank">まんがファーム</a>ならこの広告は表示されませんので、ぜひ移行をお願いします
  </div>
  <div bind:this={containerRef} class="h-72 gap-8 flex flex-row items-center justify-center overflow-hidden">
    {#each ads.slice(0, visibleCount) as adContent}
    <div class="ad">
      {@html adContent}
    </div>
    {/each}
  </div>
</div>

<style>
  .ad img[border="0"] {
    border: 0;
  }
</style>