<script lang="ts">
  import { toolTip } from '../utils/passiveToolTipStore';
  import { undoToken } from '../bookeditor/bookStore';
  import { onlineStatus, authStore, onlineProfile, onlineAccount, type SubscriptionPlan } from '../utils/accountStore';
  import Feathral from '../utils/Feathral.svelte';
  import AvatarIcon from './AvatarIcon.svelte';
  import { type ModalSettings, modalStore, toastStore } from '@skeletonlabs/skeleton';
  import { waitDialog } from "../utils/waitDialog";
  import { progress } from '../utils/loadingStore'
  import { mainBookFileSystem } from "../filemanager/fileManagerStore";
  import type { IndexedDBFileSystem } from '../lib/filesystem/indexeddbFileSystem';
  import { clearCurrentFileInfo } from '../filemanager/currentFile';
  import { developmentFlag } from '../utils/developmentFlagStore';
  import { subscriptionPlans } from '../utils/billingData/subscriptionPlans';

  import undoIcon from '../assets/undo.png';
  import redoIcon from '../assets/redo.png';
  import sprytIcon from '../assets/spryt.png';

  function getParentDomain(): string {
    return window.location.hostname.split('.').slice(1).join('.');
  }

  function getParentUrl(): string {
    const parentDomain = getParentDomain();
    console.log("getParentUrl", `https://${parentDomain}`);
    return `https://${parentDomain}`;
  }
  
  function undo() {
    $undoToken = 'undo';
  }

  function redo() {
    $undoToken = 'redo';
  }

  async function dump() {
    console.log("dump");
    const r = await waitDialog<boolean>('dump');
    if (r) {
      $progress = 0;
      await ($mainBookFileSystem as IndexedDBFileSystem).dump((n)=>$progress = n);
      $progress = 1;

      // １秒待つ
      await new Promise(resolve => setTimeout(resolve, 1000));
      $progress = null;

      console.log("dumped");
    } else {
      console.log("canceled");
    }
  }

  async function undump() {
    console.log("undump");
    const dumpFiles = await waitDialog<FileList>('undump');
    if (dumpFiles) {
      $progress = 0;
      console.log("undump start");

      await ($mainBookFileSystem as IndexedDBFileSystem).undump(dumpFiles[0]);
      await clearCurrentFileInfo();
      location.reload();

      console.log("undump done");
      $progress = 1;

      console.log("undumped");
    } else {
      console.log("canceled");
    }
  }

  function generateAuthUrl(action: 'signin' | 'signout'): string {
    const fullPath = window.location.protocol + '//' + window.location.hostname + window.location.pathname;
    const parentDomain = getParentDomain();
    const path = action === 'signin' ? 'auth' : 'auth/signout';
    return `https://${parentDomain}/${path}?next=${encodeURIComponent(fullPath)}`;
  }

  function getMangaFarmUrl() {
    return window.location.hostname === 'frameplanner.example.local'
      ? 'http://example.local:5174'
      : `${getParentUrl()}`;
  }

  function openMangaFarm() {
    console.log("openMangaFarm", window.opener, window.opener?.closed);
    console.log("managafarm: opener does not exist");

    // openerがない場合は新しいタブを名前付きで開く
    console.log("managafarm: opener does not exist");
    const targetUrl = `${getMangaFarmUrl()}/home`;
    window.location.href = targetUrl;
  }

  function onChangePlan() {
    console.log("onChangePlan");
    const targetUrl = `${getMangaFarmUrl()}/subscription`;
    window.open(targetUrl, 'billing');
  }

  function onBuySpryt() {
    console.log("onBuySpryt");
    const targetUrl = `${getMangaFarmUrl()}/spryt`;
    window.open(targetUrl, 'billing');
  }

  function signIn() {
    const authHere = $developmentFlag;
    if (authHere) {
      if (false) {
        const d: ModalSettings = {
          type: 'component',
          component: 'auth',
        };
        modalStore.trigger(d);    
      } else {
        console.log(`http://example.local:5174/auth?next=${encodeURIComponent(window.location.href)}`);
        window.location.href = `http://example.local:5174/auth?next=${encodeURIComponent(window.location.href)}`;
      }
    } else {
      window.location.href = generateAuthUrl('signin');
    }
  }

  function signOut() {
    const authHere = $developmentFlag;
    if (authHere) {
      if (false) {
        authStore.signOut();
      } else {
        console.log(`http://example.local:5174/auth/signout?next=${encodeURIComponent(window.location.href)}`);
        window.location.href = `http://example.local:5174/auth/signout?next=${encodeURIComponent(window.location.href)}`;        
      }
    } else {
      window.location.href = generateAuthUrl('signout');
    }
  }

  async function editUserProfile() {
    const r = await waitDialog<boolean>('userProfile');
    if (r) {
      toastStore.trigger({ message: "プロフィールを更新しました", timeout: 1500});
    } else {
      toastStore.trigger({ message: "プロフィール更新を取りやめました", timeout: 1500});
    }
  }

  // プレースホルダーアバター画像
  const defaultAvatar = "https://api.dicebear.com/7.x/initials/svg?seed=User";
</script>

<div class="w-screen h-8 bg-surface-900 text-slate-100 gap-2 flex items-center pl-4 pr-2 pt-2 pb-2">
  <button class="btn btn-sm bg-primary-400 undo-redo-button" on:click={undo} use:toolTip={"アンドゥ"}>
    <img src={undoIcon} alt="undo" class="h-6 w-auto"/>
  </button>
  <button class="btn btn-sm bg-primary-400 undo-redo-button" on:click={redo} use:toolTip={"リドゥ"}>
    <img src={redoIcon} alt="redo" class="h-6 w-auto"/>
  </button>
  
  <div class="flex-grow"></div>
  
  <ul class="flex space-x-6">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <li class="hover:text-yellow-500 cursor-pointer"><button on:click={openMangaFarm}>まんがファーム!へ</button></li>
    <li class="hover:text-yellow-500 cursor-pointer"><button on:click={undump}>旧FramePlannerからのデータ移行</button></li>
  </ul>

  <div class="flex-grow"></div>
  {#if $onlineProfile !== null}
    <div class="flex items-center gap-2">
      <AvatarIcon on:click={editUserProfile} username={$onlineProfile.display_name} size="w-8 h-8" />
      <span class="text-white">{$onlineProfile.display_name}</span>
      
      {#if $onlineAccount}
        {@const planId = $onlineAccount.subscriptionPlan}
        {@const planInfo = subscriptionPlans.find(plan => plan.id === planId) || subscriptionPlans[0]}
        <button
          class="px-2 rounded ml-2 cursor-pointer flex items-center justify-center w-24 {planId === 'free' ? 'bg-gray-300 text-black' : 'bg-blue-500 text-white'}"
          on:click={onChangePlan}
        >
          {planInfo.name}
        </button>
      {/if}
      
      <Feathral/>
      
      {#if $onlineAccount}
        {@const planId = $onlineAccount.subscriptionPlan}
        {@const canBuySpryt = planId === 'basic' || planId === 'premium'}
        
        {#if canBuySpryt}
          <button class="bg-green-600 text-white hover:bg-green-700 rounded ml-2 flex items-center justify-center w-16" on:click={onBuySpryt}>
            購入
          </button>
        {:else}
          <button class="bg-yellow-500 text-white hover:bg-yellow-600 rounded ml-2 flex items-center justify-center w-24" on:click={onChangePlan}>
            アップグレード
          </button>
        {/if}
      {/if}
      
      <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 hbox w-24" on:click={signOut}>
        Sign out
      </button>
    </div>
  {/if}
  {#if $onlineStatus === "signed-out"}
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 hbox w-24" on:click={signIn}>
      Sign in
    </button>
  {/if}
</div>

<style>
  .undo-redo-button {
    width: 50px;
    height: 24px;
  }
  
  /* アイコンのシャドウを白に */
  :global(.avatar img) {
    box-shadow: 0 1px 3px rgba(255, 255, 255, 0.3) !important;
  }
</style>
