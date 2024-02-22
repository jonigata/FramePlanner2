<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import '../box.css';
  import 'firebaseui/dist/firebaseui.css'
  import { onMount } from 'svelte';
  import { isPendingRedirect, startAuth } from '../firebase';

  let pending = false;

  onMount(() => {
    console.log("onMount");
    if (isPendingRedirect()) {
      pending = true;
    }
    startAuth("#firebaseui-auth-container");
  });
</script>

<div class="page-container">
  <div class="box vbox center variant-filled-surface">
    <div class="vbox center">
      {#if pending}
        ログイン処理中……
      {/if}
      <div id="firebaseui-auth-container"></div>
    </div>
  </div>

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  {#if !pending}
    <button class="back-button btn variant-filled-secondary px-2 py-2" on:click={() => modalStore.close()}>back</button>
  {/if}
</div>

<style>
  .page-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .box {
    width: 600px;
    height: 300px;
    overflow-y: auto;
    border-radius: 10px;
    color: #000;
    background-color: white;
  }
  form {
    width: 80%;
  }
  .back-button {
    margin-top: 16px;
    bottom: 8px;
    right: 8px;
    z-index: 1;
    cursor: pointer;
    color: #fff;
    width: 160px;
  }
  .input {
    padding-left: 12px;
    height: 40px;
  }
</style>