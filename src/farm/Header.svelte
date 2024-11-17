<script lang="ts">
  import { Link } from "svelte-routing";

  function openFramePlanner() {
    window.open('/farm/');
  }

  function openMyPage() {
    window.open('/farm/mypage/');
  }
</script>

<header class="shadow">
  <div class="container mx-auto px-4 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-8">
        <h1 class="text-2xl font-bold">まんがファーム！</h1>
        <nav>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <ul class="flex space-x-6">
            <li class="hover:text-yellow-500 cursor-pointer" on:click={openFramePlanner}>ホーム</li>
            <li class="hover:text-yellow-500 cursor-pointer" on:click={openMyPage}>マイページ</li>
            <!-- <li class="hover:text-yellow-500 cursor-pointer">ストア</li>
            <li class="hover:text-yellow-500 cursor-pointer">フォロー</li>
            <li class="hover:text-yellow-500 cursor-pointer">本棚</li> -->
          </ul>
        </nav>
      </div>
      
      <div class="flex items-center space-x-4">
        <div class="relative">
          <!-- <input
            type="text"
            placeholder="作品名・作者名・カテゴリで検索"
            class="w-64 px-4 py-2 border rounded-lg"
          /> -->
          <!-- <Search class="absolute right-3 top-2.5 text-gray-400" size={20} /> -->
        </div>
        <button class="btn variant-filled-primary px-4 py-2" on:click={openFramePlanner}>FramePlanner</button>
      </div>
    </div>
  </div>
</header>

<style>
  header {
    background-color: #be85dd;
  }
  h1 {
    font-family: '源暎エムゴ';
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    color: #ececec;
  }
  li {
    font-family: '源暎エムゴ';
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    color: #ececec;
  }

</style>

