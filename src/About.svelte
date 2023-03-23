<script type="ts">
  import Drawer from 'svelte-drawer-component';
  import { aboutOpen } from './aboutStore';
</script>

<Drawer open={$aboutOpen} size="600px" on:clickAway={() => $aboutOpen = false}>
  <div class="drawer-content vbox center gap">
    <div>
      <h2>FramePlanner</h2>
      <p><a href="https://github.com/jonigata/FramePlanner" target="_blank" rel="noopener noreferrer">github</a></p>
      <p><a href="https://twitter.com/jonigata_ai" target="_blank" rel="noopener noreferrer">twitter</a></p>
      <p><a href="https://t.co/UC3jJOJJtS" target="_blank" rel="noopener noreferrer">anonymous request</a></p>
    </div>
    <div>
      <h2>Tips</h2>
      <h3>Paper</h3>
      <p>Space + Drag: スクロール</p>
      <p>Wheel: ズーム</p>
    </div>
    <div>
      <h3>フレーム</h3>
      <p>Q+Click: 削除</p>
      <p>W+Click: 横に分割</p> 
      <p>E+Click: 縦に分割</p> 
    </div>
    <div>
      <h3>フキダシ</h3>
      <p>Alt+ドラッグ: 移動</p>
      <p>F+ドラッグ: 作成</p>
    </div>
    <div>
      <h3>枠線</h3>
      <p>Ctrl+ドラッグ: 太さ</p>
    </div>
  </div>
</Drawer>

<style>
  .drawer-content {
    height: 100%;
  }
</style>