<script type="ts">
  import Drawer from './Drawer.svelte'
  import { aboutOpen } from './aboutStore';
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import aiPictorsIcon from './assets/aipictors_logo_0.png'

  function showComic() {
    const d: ModalSettings = {
      type: 'component',
      component: 'comic',
    };
    modalStore.trigger(d);    
  }
</script>


<div class="drawer-outer">
<Drawer open={$aboutOpen} size="600px" on:clickAway={() => $aboutOpen = false}>
  <div class="drawer-content">
    <h2>FramePlanner</h2>

    <h3>紹介・入門記事</h3>
    <p>
      <a href="https://blogcake.net/ai-comic/" target="_blank" rel="noopener noreferrer">AIで漫画を描く！？FramePlannerで作る漫画の作り方</a>
    </p>
    <p>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <span class="comic-link" on:click={showComic}>はじめてのFramePlanner（まんが入門！）</span>(<a href="https://twitter.com/aiai61555228" target="_blank" rel="noopener noreferer">@aiai61555228</a>)
    </p>

    <h3>ギャラリー</h3>
    <p class="inline-elements">
      <a href="https://www.aipictors.com/search/?tag=frameplanner" target="_blank" rel="noopener noreferrer">
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

    <!-- svelte-ignore a11y-click-events-have-key-events -->
  
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
    <p>E+Click: 画像フィット</p>
    <p>B+ドラッグ: パディング変更</p>
<br/>
    <p>ドラッグ: 画像移動(+Shiftでフィットしながら)</p>
    <p>Ctrl+ドラッグ: 画像スケール(+Shiftでフィットしながら)</p>
    <p>Alt+ドラッグ: 画像回転</p>

    <h3>フキダシ</h3>
    <p>Alt+ドラッグ: 移動</p>
    <p>F+ドラッグ: 作成</p>
    <p>ダブルクリック: 作成</p>
    <p>Q+クリック: 削除</p>
    <p>S+ドラッグ(対象にドロップ): スタイルのコピー</p>
    <p>画像をドロップ: 画像フキダシ化</p>
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

    <h3>sdwebui連携</h3>
    <dl>
      <dt>API有効化、CORS対応</dt>
      <dd>sdwebui起動時に、COMMANDLINE_ARGSに'--api --cors-allow-origins https://frameplanner-e5569.web.app'を指定する</dd>
      <dt>Mixed contet対応</dt>
      <dd>以下のどれかを行う
        <ol>
          <li>sdwebuiをhttpsでホスト</li>
          <li>sdwebuiでngrokなどを使う</li>
          <li><a href="https://t.co/m48tNsHWzB">ブラウザのセキュリティを緩める</a></li>
        </ol>
      </dd>
      <dt>URL入力</dt>
      <dd>各コマの「<img style="display: inline;" width="18" height="18" src='./src/assets/generate-image.png' alt="generate"/>画像生成」   ボタンを押し、「URL」にsdwebuiのURLを入力する</dd>
      <dt>scribble</dt>
      <dd><a href="https://twitter.com/jonigata_ai/status/1659567680695992320">動画(Twitter)</a></dd>
    </dl>

    <h2>Q&A</h2>
    <dl>
      <dt>Q.「クリップボードを使う」をブロックしてしまったが、使いたい</dt>
      <dd>A.ブラウザの設定のサイトごとのセキュリティで「許可」してください。ブラウザのURL欄の鍵アイコンでできるみたいです。</dd>
      <dt>Q.フキダシの透明度を変えたい</dt>
      <dd>A.フキダシインスペクタの下の方に色設定があるので、そこをクリックしてカラーピッカーを開いたら右端の透明度スライダーを操作してください</dd>
    </dl>

    <h2>注意</h2>
    <ul>
      <li>Share機能で作ったドキュメントは突然予告もなく消すことがあります</li>
    </ul>

    <h2>フォント ライセンス</h2>
    <p class="verbatim">
      Copyright (c) 2020-2021, おたもん (http://okoneya.jp/font/), with Reserved Font Name '源暎'.

      Copyright (c) 2017, M+ FONTS PROJECT.
      Copyright (c) 2014, Indian Type Foundry (info@indiantypefoundry.com).
      Copyright (c) 2017, Adobe Systems Incorporated (http://www.adobe.com/)
                              , with Reserved Font Name 'Source'.
      Copyright (c) 2015, 自家製フォント工房 by MM (http://jikasei.me/font/mgenplus/).
      Copyright (c) 2015, Google Inc.
      
      
      This Font Software is licensed under the SIL Open Font License,
      Version 1.1.
      
      This license is copied below, and is also available with a FAQ at:
      http://scripts.sil.org/OFL
      
      -----------------------------------------------------------
      SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
      -----------------------------------------------------------
      
      PREAMBLE
      The goals of the Open Font License (OFL) are to stimulate worldwide
      development of collaborative font projects, to support the font
      creation efforts of academic and linguistic communities, and to
      provide a free and open framework in which fonts may be shared and
      improved in partnership with others.
      
      The OFL allows the licensed fonts to be used, studied, modified and
      redistributed freely as long as they are not sold by themselves. The
      fonts, including any derivative works, can be bundled, embedded,
      redistributed and/or sold with any software provided that any reserved
      names are not used by derivative works. The fonts and derivatives,
      however, cannot be released under any other type of license. The
      requirement for fonts to remain under this license does not apply to
      any document created using the fonts or their derivatives.
      
      DEFINITIONS
      "Font Software" refers to the set of files released by the Copyright
      Holder(s) under this license and clearly marked as such. This may
      include source files, build scripts and documentation.
      
      "Reserved Font Name" refers to any names specified as such after the
      copyright statement(s).
      
      "Original Version" refers to the collection of Font Software
      components as distributed by the Copyright Holder(s).
      
      "Modified Version" refers to any derivative made by adding to,
      deleting, or substituting -- in part or in whole -- any of the
      components of the Original Version, by changing formats or by porting
      the Font Software to a new environment.
      
      "Author" refers to any designer, engineer, programmer, technical
      writer or other person who contributed to the Font Software.
      
      PERMISSION & CONDITIONS
      Permission is hereby granted, free of charge, to any person obtaining
      a copy of the Font Software, to use, study, copy, merge, embed,
      modify, redistribute, and sell modified and unmodified copies of the
      Font Software, subject to the following conditions:
      
      1) Neither the Font Software nor any of its individual components, in
      Original or Modified Versions, may be sold by itself.
      
      2) Original or Modified Versions of the Font Software may be bundled,
      redistributed and/or sold with any software, provided that each copy
      contains the above copyright notice and this license. These can be
      included either as stand-alone text files, human-readable headers or
      in the appropriate machine-readable metadata fields within text or
      binary files as long as those fields can be easily viewed by the user.
      
      3) No Modified Version of the Font Software may use the Reserved Font
      Name(s) unless explicit written permission is granted by the
      corresponding Copyright Holder. This restriction only applies to the
      primary font name as presented to the users.
      
      4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
      Software shall not be used to promote, endorse or advertise any
      Modified Version, except to acknowledge the contribution(s) of the
      Copyright Holder(s) and the Author(s) or with their explicit written
      permission.
      
      5) The Font Software, modified or unmodified, in part or in whole,
      must be distributed entirely under this license, and must not be
      distributed under any other license. The requirement for fonts to
      remain under this license does not apply to any document created using
      the Font Software.
      
      TERMINATION
      This license becomes null and void if any of the above conditions are
      not met.
      
      DISCLAIMER
      THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
      EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
      MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
      OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
      COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
      INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
      DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
      FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
      OTHER DEALINGS IN THE FONT SOFTWARE.    
    </p>
  </div>
</Drawer>
</div>

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
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .inline-elements * {
    display: inline-block;
    vertical-align: middle;
  }  
  p.verbatim {
    white-space: pre-line;
  }
</style>