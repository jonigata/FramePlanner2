<script lang="ts">
  import { onMount } from "svelte";
  import { isPendingRedirect, prepareAuth, getAuth } from '../firebase';
  import { accountUser } from "../utils/accountStore";
  import { modalStore } from '@skeletonlabs/skeleton';
  import { toolTip } from '../utils/passiveToolTipStore';
  import { undoToken } from '../bookeditor/bookStore';

  import undoIcon from '../assets/undo.png';
  import redoIcon from '../assets/redo.png';
  
  type OnlineStatus = "unknown" | "signed-in" | "signed-out";
  let onlineStatus: OnlineStatus = "unknown";

  function undo() {
    $undoToken = 'undo';
  }

  function redo() {
    $undoToken = 'redo';
  }

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

<div class="w-screen h-8 bg-surface-900 text-slate-100 gap-2 flex items-center pl-4 pr-2 pt-2 pb-2">
  <div class="flex-grow"></div>
  <button class="btn btn-sm bg-primary-400 undo-redo-button" on:click={undo} use:toolTip={"アンドゥ"}>
    <img src={undoIcon} alt="undo" class="h-6 w-auto"/>
  </button>
  <button class="btn btn-sm bg-primary-400 undo-redo-button" on:click={redo} use:toolTip={"リドゥ"}>
    <img src={redoIcon} alt="redo" class="h-6 w-auto"/>
  </button>
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
  .function-button {
    width: 125px;
  }
  .undo-redo-button {
    width: 50px;
    height: 24px;
  }
</style>
