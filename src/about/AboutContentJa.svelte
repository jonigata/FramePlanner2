<script lang="ts">
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import aiPictorsIcon from '../assets/aipictors_logo_0.webp';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { onlineAccount } from '../utils/accountStore';
  import { contact } from '../supabase';

  let contactText = "";

  function showComic() {
    const d: ModalSettings = {
      type: 'component',
      component: 'comic',
    };
    modalStore.trigger(d);    
  }

  function showLicense() {
    const d: ModalSettings = {
      type: 'component',
      component: 'license',
    };
    modalStore.trigger(d);    
  }
  
  async function doContact() {
    console.log(contactText);
    if (contactText == null || contactText == "") {
      toastStore.trigger({ message: '要望を入力してください', timeout: 1500});
      return;
    }
    if (contactText === "throw error") {
      throw new Error("intentional error");
    }
    try {
      await contact({message:contactText});
      toastStore.trigger({ message: '要望を投稿しました', timeout: 1500});
      contactText = "";
    }
    catch (e) {
      toastStore.trigger({ message: '要望の投稿に失敗しました', timeout: 1500});
      console.log(e);
    }
  }
</script>

<div>
  <h2>FramePlanner</h2>

  <h3>紹介・入門記事</h3>
  <p>
    <a href="https://www.youtube.com/channel/UC3kZKl2Q5IvlFKnJ8RHKBGw">Youtube ムービーマニュアル</a>
  </p>
  <p>
    <a href="https://blogcake.net/ai-comic/" target="_blank" rel="noopener noreferrer">AIで漫画を描く！？FramePlannerで作る漫画の作り方</a>
  </p>
  <p>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <span class="comic-link" on:click={showComic}>はじめてのFramePlanner（まんが入門！）</span>(<a href="https://twitter.com/aiai61555228" target="_blank" rel="noopener noreferer">@aiai61555228</a>)
  </p>

  <h3>ギャラリー</h3>
  <p class="inline-elements">
    <a href="https://www.aipictors.com/tags/frameplanner?orderBy=LIKES_COUNT&sort=DESC&page=0&prompt=0
    https://www.aipictors.com/search/?tag=frameplanner" target="_blank" rel="noopener noreferrer">
      <img width=110 src={aiPictorsIcon} alt="aipictors"/>
    </a>
    <a href="https://www.chichi-pui.com/posts/tags/FramePlanner/" target="_blank" rel="noopener noreferrer">ちちぷい</a>
    <a href="https://twitter.com/hashtag/frameplanner?src=hashtag_click&f=live" target="_blank" rel="noopener noreferrer">#frameplanner(Twitter)</a>
  </p>

  <h3>資料</h3>
  <p>
    <a href="https://github.com/jonigata/FramePlanner2" target="_blank" rel="noopener noreferrer">github</a>
    <a href="https://twitter.com/jonigata_ai" target="_blank" rel="noopener noreferrer">twitter</a>
    <a href="https://t.co/UC3jJOJJtS" target="_blank" rel="noopener noreferrer">anonymous request</a>
  </p>

  <h2>チートシート</h2>
  <p>※文字キー＋クリックはインスペクタを非表示にしてから</p>

  <h3>画面全体</h3>
  <p>Space+ドラッグ: スクロール（手のひらツール）</p>
  <p>右ドラッグ: スクロール（手のひらツール）</p>
  <p>Wheel: ズーム</p>
  <p>Undo/Redo: Ctrl+Z/Shift+Ctrl+Z</p>

  <h3>コマと画像</h3>
  <p>画像をドロップ: はめこみ</p>
  <p>Q+Click: 削除</p>
  <p>W+Click: 横に分割</p> 
  <p>S+Click: 縦に分割</p> 
  <p>D+Click: 画像削除</p>
  <p>T+Click: 画像左右反転</p>
  <p>Y+Click: 画像上下反転</p>
  <p>E+Click: 画像フィット</p>
  <p>B+ドラッグ: パディング変更</p>
<br/>
  <p>ドラッグ: 画像移動(+Shiftでフィットしながら)</p>
  <p>Ctrl+ドラッグ: 画像スケール(+Shiftでフィットしながら)</p>
  <p>Alt+ドラッグ: 画像回転</p>

  <h3>枠線</h3>
  <p>Ctrl+ドラッグ: 太さ</p>
  <p>Shift+ドラッグ: 傾き(Altを押していると15度単位)</p>
  <p>※傾かせすぎに関しては自己責任でお願いします</p>
  <p>T+クリック: 分割縦横のフリップ</p>

  <h3>フキダシ</h3>
  <p>Alt+ドラッグ: 移動</p>
  <p>F+ドラッグ: 作成</p>
  <p>G+ドラッグ: 透明画像つきで作成</p>
  <p>なにもないところでダブルクリック: 作成</p>
  <p>フキダシをダブルクリック: 適当な大きさ</p>
  <p>Q+クリック: 削除</p>
  <p>S+ドラッグ(対象にドロップ): スタイルのコピー</p>
  <p>フキダシに画像をドロップ: 画像フキダシ化</p>
  <p>テキストをペースト: 作成</p>
  <p>空行区切りテキストをペースト: 一気に作成</p>
  <p>インスペクタのテキスト上でShift+Enter: そこで分割</p>

  <h3>画像フキダシ</h3>
  <p>ドラッグ: 移動</p>
  <p>Ctrl+ドラッグ: スケール</p>
  <p>画像ファイルを左上のフキダシアイコンにドロップ: 作成</p>
  <p>画像をペースト: 作成</p>

  <h3>sdwebui連携</h3>
  <dl>
    <dt>API有効化、CORS対応</dt>
    <dd>sdwebui起動時に、COMMANDLINE_ARGSに'--api --cors-allow-origins https://frameplanner-e5569.web.app'を指定する</dd>
    <dt>Mixed content対応</dt>
    <dd>以下のどれかを行う
      <ol>
        <li>sdwebuiをhttpsでホスト</li>
        <li>sdwebuiでngrokなどを使う</li>
        <li><a href="https://t.co/m48tNsHWzB">ブラウザのセキュリティを緩める</a></li>
      </ol>
    </dd>
    <dt>URL入力</dt>
    <dd>各コマやフキダシのレイヤーリストで「＋」ボタンを押し、右サイドに画像生成パネルが出たら「Stable Diffusion」タブを選択する。「URL」にsdwebuiのURLを入力する</dd>
    <dt>scribble</dt>
    <dd><a href="https://twitter.com/jonigata_ai/status/1659567680695992320">動画(Twitter)</a></dd>
  </dl>

  <h2>Q&A</h2>
  <dl>
    <dt>Q.「クリップボードを使う」をブロックしてしまったが、使いたい</dt>
    <dd>A.ブラウザの設定のサイトごとのセキュリティで「許可」してください。ブラウザのURL欄の鍵アイコンでできるみたいです。</dd>
    <dt>Q.フキダシの透明度を変えたい</dt>
    <dd>A.フキダシインスペクタの下の方に色設定があるので、そこをクリックしてカラーピッカーを開いたら右端の透明度スライダーを操作してください</dd>
    <dt>Q.ダウンロードしたパッケージを読み込むには？</dt>
    <dd>A.ファイルマネージャにドロップしてください</dd>
  </dl>

  <h2>注意</h2>
  <ul>
    <li>Share機能で作ったドキュメントは突然予告もなく消すことがあります</li>
  </ul>

  <h2>ライセンス</h2>
  <p>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <span class="comic-link" on:click={showLicense}>ライセンス</span>
  </p>

  {#if $onlineAccount}
    <h2>要望(Contact)</h2>
    <p>回答はX(<a href="https://x.com/jonigata_ai" target="_blank" rel="noopener noreferrer">https://x.com/jonigata_ai</a>)で行うことがあります</p>
    <div class="hbox mx-2" style="margin-top: 4px;">
      <textarea class="mx-2 my-2 rounded-container-token grow textarea" bind:value={contactText}></textarea>
      <button class="btn btn-sm variant-filled paper-size"  on:click={doContact}>送信</button>
    </div>
  {:else}
    <h2>要望(Contact)</h2>
    <p>ログインすると匿名の要望を送ることができます。</p>
    <p>回答はX(<a href="https://x.com/jonigata_ai" target="_blank" rel="noopener noreferrer">https://x.com/jonigata_ai</a>)で行うことがあります</p>
  {/if}
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    margin-top: 16px;
  }
  h3 { 
    font-family: '源暎エムゴ';
    font-size: 18px;
    margin-top: 8px;
  }
  p {
    font-family: '源暎アンチック';
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
  ul {
    margin-left: 32px;
  }
  ol {
    margin-left: 32px;
  }
  ol li {
    list-style-type: none;
    counter-increment: cnt;
  }
  ol li::before {
    content: counter(cnt)". ";
  }
  .comic-link {
    cursor: pointer;
    text-decoration: underline;
    color: #0000ff;
  }
  .inline-elements * {
    display: inline-block;
    vertical-align: middle;
  }
</style>