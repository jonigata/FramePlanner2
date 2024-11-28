<script lang="ts">
  import { onlineStatus, signIn, signOut } from '../utils/accountStore';
  import Feathral from '../utils/Feathral.svelte';
  import AvatarIcon from '../toolbar/AvatarIcon.svelte';
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';

  function editUserProfile() {
    const d: ModalSettings = {
      type: 'component',
      component: 'userProfile',
    };
    modalStore.trigger(d);    
  }
</script>

<div class="flex items-center space-x-4">
  {#if $onlineStatus === "signed-in"}
    <Feathral/>
    <AvatarIcon on:click={editUserProfile}/>
  {/if}
  {#if $onlineStatus === "signed-out"}
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 w-24 h-8" on:click={signIn}>
      Sign in
    </button>
  {/if}
  {#if $onlineStatus === "signed-in"}
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 w-24 h-8" on:click={signOut}>
      Sign out
    </button>
  {/if}
</div>
