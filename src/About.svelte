<script type="ts">
  import Drawer from 'svelte-drawer-component';
  import { aboutOpen } from './aboutStore';
  import { Modal, modalStore } from '@skeletonlabs/skeleton';
  import type { ModalSettings, ModalComponent } from '@skeletonlabs/skeleton';    

  function showComic() {
    const d: ModalSettings = {
      type: 'component',
      component: 'comic',
    };
    modalStore.trigger(d);    
  }
</script>

<Drawer open={$aboutOpen} size="600px" on:clickAway={() => $aboutOpen = false}>
  <div class="drawer-content">
    <h2>FramePlanner</h2>

    <p>
      <a href="https://github.com/jonigata/FramePlanner2" target="_blank" rel="noopener noreferrer">github</a>
      <a href="https://twitter.com/jonigata_ai" target="_blank" rel="noopener noreferrer">twitter</a>
      <a href="https://t.co/UC3jJOJJtS" target="_blank" rel="noopener noreferrer">anonymous request</a>
    </p>

    <p>
      <a href="https://www.chichi-pui.com/posts/tags/FramePlanner/" target="_blank" rel="noopener noreferrer">ちちぷい</a>
      <a href="https://twitter.com/hashtag/frameplanner?src=hashtag_click&f=live" target="_blank" rel="noopener noreferrer">#frameplanner(Twitter)</a>
    </p>

    <p>
      紹介記事: <a href="https://blogcake.net/ai-comic/" target="_blank" rel="noopener noreferrer">AIで漫画を描く！？FramePlannerで作る漫画の作り方</a>
    </p>

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <p><span class="comic-link" on:click={showComic}>はじめてのFramePlanner</span>(<a href="https://twitter.com/aiai61555228" target="_blank" rel="noopener noreferer">@aiai61555228</a>)</p>
  
    <h2>チートシート</h2>

    <h3>ペーパー</h3>
    <p>Space + Drag: スクロール</p>
    <p>Wheel: ズーム</p>
    <p>Undo/Redo: Ctrl+Z/Shift+Ctrl+Z</p>

    <h3>フレーム</h3>
    <p><b>画像をドロップ: はめこみ</b></p>
    <p>Q+Click: 削除</p>
    <p>W+Click: 横に分割</p> 
    <p>S+Click: 縦に分割</p> 
    <p>D+Click: 画像削除</p>
    <p>T+Click: 画像左右反転</p>
    <p>Y+Click: 画像上下反転</p>
    <p>B+ドラッグ: パディング変更</p>

    <p>ドラッグ: 画像移動</p>
    <p>Ctrl+ドラッグ: 画像スケール</p>

    <h3>フキダシ</h3>
    <p>Alt+ドラッグ: 移動</p>
    <p>F+ドラッグ: 作成</p>
    <p>ダブルクリック: 作成</p>
    <p>Q+クリック: 削除</p>
    <p>画像をドロップ: 画像フキダシ</p>
    <p>テキストをペースト: 作成</p>
    <p>空行区切りテキストをペースト: 一気に作成</p>

    <h3>画像フキダシ</h3>
    <p>ドラッグ: 移動</p>
    <p>Ctrl+ドラッグ: スケール</p>
    <p>画像ファイルを左上のフキダシアイコンにドロップ: 作成</p>
    <p>画像をペースト: 作成</p>

    <h3>枠線</h3>
    <p>Ctrl+ドラッグ: 太さ</p>
    <p>Shift+ドラッグ: 傾き</p>
    <p>※傾かせすぎに関しては自己責任でお願いします</p>

    <h2>Q&A</h2>
    <dl>
      <dt>Q.「クリップボードを使う」をブロックしてしまったが、使いたい</dt>
      <dd>A.ブラウザの設定のサイトごとのセキュリティで「許可」してください</dd>
      <dt>Q.フキダシの透明度を変えたい</dt>
      <dd>A.フキダシインスペクタの下の方に色設定があるので、そこをクリックしてカラーピッカーを開いたら右端の透明度スライダーを操作してください</dd>
    </dl>

    
  </div>
</Drawer>

<style>
  .drawer-content {
    width: 100%;
    height: 100%;
    font-family: 'Yu Gothic', sans-serif;
    font-weight: 500;
    text-align: left;
    padding-top: 16px;
    padding-left: 16px;
  }
  h2 {
    margin-top: 16px;
  }
  h3 { 
    margin-top: 8px;
  }
  p {
    margin-left: 32px;
  }
  dt {
    font-weight: 700;
    margin-top: 8px;
    margin-left: 16px;
  }
  dd {
    margin-left: 32px;
  }
  .comic-link {
    cursor: pointer;
    text-decoration: underline;
    color: #0000ff;
  }
</style>