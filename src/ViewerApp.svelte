<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';

  import MangaView from "./mangaview/MangaView.svelte";
  import { Modals } from 'svelte-modals'
  import FullScreenLoading from './utils/FullScreenLoading.svelte';
</script>

<!-- 左右 -->
<div class="flex w-full h-full">
<aside class="w-1/4 h-full">
  <h2>タイトル</h2>
  <p>あした晴れる</p>
  <h2>作者</h2>
  <p>佐藤十四郎</p>
  <h2>説明</h2>
  <p>
    都会の片隅にある古い神社には、人々の心の“影”が集まる異世界が存在していた。そこを守る白い狐の霊「白狐」は、人々の悩みや恐れを影の世界に引き込み、浄化していた。

    ある日、自分の兄が突然失踪した少女・希美（のぞみ）が、影の世界に迷い込み、影を渡る力を手にする。希美と白狐は共に影の世界を巡り、心の影に潜む化身と対峙しながら兄の行方を追う。しかし、影の世界にはさらに強大な“真の影”が潜んでおり、二人はその存在に立ち向かうことを決意する。
    
    希美は兄を見つけ出し、白狐は神社を守ることができるのか──？  
  </p>
  <h2>作成日</h2>
  <p>2021/10/10</p>
</aside>
<main class="w-full h-full">
  <MangaView/>
</main>
</div>

<Modals>
  <div slot="backdrop" class="backdrop"/>
</Modals>
<FullScreenLoading/>

<style>
  .backdrop {
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    background: rgba(0,0,0,0.50);
    z-index: 999;
  }
  aside {
    padding: 16px;
    border-right: 1px solid #ddd;
  }
  aside p {
    font-family: '源暎アンチック';
    margin-left: 16px;
    margin-bottom: 16px;
  }
  h2 {
    font-family: '源暎エムゴ';
    font-size: 1.2rem;
    color: #666;
    margin-bottom: -8px;
  }
</style>
