<script lang="ts">
  import { onlineStatus, signIn, signOut } from '../utils/accountStore';
  import Feathral from '../utils/Feathral.svelte';
  import AvatarIcon from '../toolbar/AvatarIcon.svelte';
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';

  function openHome() {
    window.open('/farm/');
  }

  function openMyPage() {
    window.open('/farm/mypage/');
  }

  function openFramePlanner() {
    window.open('/');
  }

  function editUserProfile() {
    const d: ModalSettings = {
      type: 'component',
      component: 'userProfile',
    };
    modalStore.trigger(d);    
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
            <li class="hover:text-yellow-500 cursor-pointer" on:click={openHome}>ホーム</li>
            <li class="hover:text-yellow-500 cursor-pointer" on:click={openMyPage}>マイページ</li>
            <li class="hover:text-yellow-500 cursor-pointer" on:click={openFramePlanner}>FramePlanner</li>
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
        {#if $onlineStatus === "signed-in"}
          <Feathral/>
          <AvatarIcon on:click={editUserProfile}/>
        {/if}
        {#if $onlineStatus === "signed-out"}
          <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={signIn}>
            Sign in
          </button>
        {/if}
        {#if $onlineStatus === "signed-in"}
          <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={signOut}>
            Sign out
          </button>
        {/if}
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

