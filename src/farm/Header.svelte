<script lang="ts">
  import AccountPanel from './AccountPanel.svelte';

  function openHome() {
    window.open('/farm/', '_self');
  }

  function openMyPage() {
    window.open('/farm/mypage/', '_self');
  }

  function openFramePlanner() {
    window.open('/', 'frameplanner');
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
          </ul>
        </nav>
      </div>

      <AccountPanel />
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

