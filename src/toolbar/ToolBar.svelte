<script lang="ts">
  import { toolTip } from '../utils/passiveToolTipStore';
  import { undoToken } from '../bookeditor/bookStore';
  import { onlineStatus, signIn, signOut } from '../utils/accountStore';
  import { tryOutToken } from '../utils/tryOutStore';
  import Feathral from '../utils/Feathral.svelte';
  import AvatarIcon from './AvatarIcon.svelte';
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';

  import undoIcon from '../assets/undo.png';
  import redoIcon from '../assets/redo.png';
  
  function undo() {
    $undoToken = 'undo';
  }

  function redo() {
    $undoToken = 'redo';
  }

  function tryOut() {
    $tryOutToken = true;
  }

  function editUserProfile() {
    const d: ModalSettings = {
      type: 'component',
      component: 'userProfile',
    };
    modalStore.trigger(d);    
  }

  // プレースホルダーアバター画像
  const defaultAvatar = "https://api.dicebear.com/7.x/initials/svg?seed=User";
</script>

<div class="w-screen h-8 bg-surface-900 text-slate-100 gap-2 flex items-center pl-4 pr-2 pt-2 pb-2">
  <!-- 
  <button class="btn btn-sm bg-primary-400 undo-redo-button" on:click={tryOut} use:toolTip={"tryOut"}>
    TryOut
  </button>
  -->
  <button class="btn btn-sm bg-primary-400 undo-redo-button" on:click={undo} use:toolTip={"アンドゥ"}>
    <img src={undoIcon} alt="undo" class="h-6 w-auto"/>
  </button>
  <button class="btn btn-sm bg-primary-400 undo-redo-button" on:click={redo} use:toolTip={"リドゥ"}>
    <img src={redoIcon} alt="redo" class="h-6 w-auto"/>
  </button>
  
  <div class="flex-grow"></div>
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

<style>
  .function-button {
    width: 125px;
  }
  .undo-redo-button {
    width: 50px;
    height: 24px;
  }
</style>
