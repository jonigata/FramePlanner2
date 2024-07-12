<script lang="ts">
  import { onMount } from "svelte";
  import { isPendingRedirect, postContact, prepareAuth, listSharedImages, getAuth } from '../firebase';
  import { accountUser } from "../utils/accountStore";
  import { controlPanelOpen } from '../controlpanel/controlPanelStore';
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import titleBarIcon from '../assets/title-control-panel.png';
  
  type OnlineStatus = "unknown" | "signed-in" | "signed-out";
  let onlineStatus: OnlineStatus = "unknown";

  async function signIn() {
    modalStore.trigger({ type: 'component', component: 'signIn' });
  }

  async function signOut() {
    const auth = getAuth();
    await auth.signOut();
    // reload
    location.reload();
  }

  onMount(() => {
    prepareAuth();
    if (isPendingRedirect()) {
      console.log("isPendingRedirect");
      signIn();
    }

    const auth = getAuth();
    auth.onAuthStateChanged((user) => {
      console.log("onAuthStateChanged", user);
      if (user) {
        onlineStatus = "signed-in";
        $accountUser = user;
      } else {
        onlineStatus = "signed-out";
        $accountUser = null;
      }
    });
  });
</script>

<div class="w-screen h-8 bg-surface-900 text-slate-100 gap-8 flex items-center pl-4 pr-2 pt-2 pb-2">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <img class="title-image" src={titleBarIcon} alt="title" on:click={() => $controlPanelOpen = !$controlPanelOpen}/> 
  <div class="flex-grow"></div>
  {#if onlineStatus === "signed-out"}
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={signIn}>
      Sign in
    </button>
  {/if}
  {#if onlineStatus === "signed-in"}
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={signOut}>
      Sign out
    </button>
  {/if}
</div>

<style>
  .title-image {
    width: 24px;
    height: 24px;
  }
  .function-button {
    width: 125px;
  }
</style>
