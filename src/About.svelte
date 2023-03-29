<script type="ts">
  import Drawer from 'svelte-drawer-component';
  import { aboutOpen } from './aboutStore';
</script>

<Drawer open={$aboutOpen} size="600px" on:clickAway={() => $aboutOpen = false}>
  <div class="drawer-content vbox center gap">
    <div>
      <h2>FramePlanner</h2>
      <p><a href="https://github.com/jonigata/FramePlanner2" target="_blank" rel="noopener noreferrer">github</a></p>
      <p><a href="https://twitter.com/jonigata_ai" target="_blank" rel="noopener noreferrer">twitter</a></p>
      <p><a href="https://t.co/UC3jJOJJtS" target="_blank" rel="noopener noreferrer">anonymous request</a></p>
    </div>
    <div>
      <h2>チートシート</h2>

      <h3>ペーパー</h3>
      <p>Space + Drag: スクロール</p>
      <p>Wheel: ズーム</p>
      <p>Undo/Redo: Ctrl+Z/Shift+Ctrl+Z</p>
    </div>
    <div>
      <h3>フレーム</h3>
      <p>Q+Click: 削除</p>
      <p>W+Click: 横に分割</p> 
      <p>S+Click: 縦に分割</p> 
      <p>D+Click: 画像削除</p>
      <p>T+Click: 画像左右反転</p>
      <p>Y+Click: 画像上下反転</p>
    </div>
    <div>
      <h3>フキダシ</h3>
      <p>Alt+ドラッグ: 移動</p>
      <p>F+ドラッグ: 作成</p>
      <p>Q+クリック: 削除</p>
      <p>画像をドロップ: 画像フキダシ</p>
    </div>
    <div>
      <h3>画像フキダシ</h3>
      <p>ドラッグ: 移動</p>
      <p>Ctrl+ドラッグ: スケール</p>
    </div>
    <div>
      <h3>枠線</h3>
      <p>Ctrl+ドラッグ: 太さ</p>
      <p>Shift+ドラッグ: 傾き</p>
      <p>※傾かせすぎと傾き分割を行った要素の子要素の分割に関しては自己責任でお願いします</p>
    </div>
    <div>
      <h3>コマ</h3>
      <p>R+ドラッグ: マージン変更</p>
    </div>
    <div>
      <h2>Q&A</h2>
      <dl>
        <dt>Q: 「セリフ作成時にクリップボードを使う」をブロックしてしまったが、使いたい</dt>
        <dd>A.ブラウザの設定のサイトごとのセキュリティ設定で「許可」にしてください</dd>
      </dl>
      <h2>AI画像SNS</h2>
      
      <p><a href="https://www.chichi-pui.com/posts/tags/FramePlanner/" target="_blank" rel="noopener noreferrer">ちちぷい</a></p>
    </div>
  </div>
</Drawer>

<style>
  .drawer-content {
    height: 100%;
  }
</style>