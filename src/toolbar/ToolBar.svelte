<script lang="ts">
  import { toolTip } from '../utils/passiveToolTipStore';
  import streamSaver from 'streamsaver';
  import { undoToken } from '../bookeditor/workspaceStore';
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
  import { subscriptionPlans, subscriptionPlansEn } from '../utils/billingData/subscriptionPlans';
  import { mainBookTitle } from '../bookeditor/workspaceStore';
  import sprytIcon from '../assets/spryt.webp';
  import LanguageSwitcher from './LanguageSwitcher.svelte';
  import { _ } from 'svelte-i18n';

  import undoIcon from '../assets/undo.webp';
  import redoIcon from '../assets/redo.webp';

  function getParentDomain(): string {
    return window.location.hostname.split('.').slice(1).join('.');
  }

  function getParentUrl(): string {
    const parentDomain = getParentDomain();
    console.log("getParentUrl", `https://${parentDomain}`);
    return `https://${parentDomain}`;
  }
  
  function getCurrentPlanName(planId: string | null | undefined): string {
    console.log("************* getCurrentPlanName", planId);
    const allPlans = [...subscriptionPlans, ...subscriptionPlansEn];
    return allPlans.find((p) => p.id === (planId ?? 'free'))?.name ?? '';
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
      // 新インターフェイス: optionsオブジェクトでonProgressを渡す
      $progress = 0;
      const stream = await ($mainBookFileSystem as IndexedDBFileSystem).dump({
        onProgress: n => $progress = n
      });

      // 例: streamSaver で保存する場合
      // import streamSaver from 'streamsaver'; が必要
      const fileStream = streamSaver.createWriteStream('filesystem-dump.ndjson');
      await stream.pipeTo(fileStream);

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
    if (!$mainBookFileSystem) {
      // 慌てて押す人がいるっぽい
      return;
    }
    const dumpFiles = await waitDialog<FileList>('undump');
    if (dumpFiles) {
      console.log("undump start");

      // File から ReadableStream を取得し options で onProgress を渡す
      await ($mainBookFileSystem as IndexedDBFileSystem).undump(
        dumpFiles[0].stream(),
        { onProgress: n => $progress = n }
      );
      await clearCurrentFileInfo();
      console.log("undump done");
      location.reload();
    } else {
      console.log("undump canceled");
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
    authStore.signOut();
    const authHere = $developmentFlag;
    if (authHere) {
      console.log(`http://example.local:5174/auth/signout?next=${encodeURIComponent(window.location.href)}`);
      window.location.href = `http://example.local:5174/auth/signout?next=${encodeURIComponent(window.location.href)}`;        
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

<div class="w-screen min-h-8 bg-surface-900 text-slate-100 gap-2 flex items-center pl-4 pr-2 pt-2 pb-2">
  <button class="btn btn-sm bg-primary-400 undo-redo-button" on:click={undo} use:toolTip={$_('ui.undo')}>
    <img src={undoIcon} alt="undo" class="h-6 w-auto"/>
  </button>
  <button class="btn btn-sm bg-primary-400 undo-redo-button" on:click={redo} use:toolTip={$_('ui.redo')}>
    <img src={redoIcon} alt="redo" class="h-6 w-auto"/>
  </button>
  
  <ul class="flex space-x-6 ml-8">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <li class="hover:text-yellow-500 cursor-pointer"><button on:click={openMangaFarm}>{$_('toolbar.toMangaFarm')}</button></li>
    <li class="hover:text-yellow-500 cursor-pointer"><button on:click={undump}>{$_('toolbar.dataImport')}</button></li>
  </ul>

  <div class="flex-grow"></div>
  <div class="rounded variant-filled-tertiary px-2 text-white">{$mainBookTitle}</div>

  <div class="flex-grow"></div>
  
  <LanguageSwitcher />
  {#if $onlineStatus === "signed-in"}
    <div class="flex items-center gap-2">
      {#if $onlineAccount !== null}
        <AvatarIcon on:click={editUserProfile} avatarUrl={$onlineAccount.avatar} username={$onlineProfile?.display_name ?? null}/>
      {/if}
      <span class="text-white">{$onlineProfile?.display_name ?? $_('toolbar.profileNotRegistered')}</span>
      
      {#if $onlineAccount}
        {@const planId = $onlineAccount.subscriptionPlan}
        <button
          class="px-2 rounded ml-2 cursor-pointer flex items-center justify-center w-24 {planId === 'free' ? 'bg-gray-300 text-black' : 'bg-blue-500 text-white'}"
          on:click={onChangePlan}
        >
          {getCurrentPlanName(planId)}
        </button>
      {/if}
      
      <Feathral/>
      
      {#if $onlineAccount}
        {@const planId = $onlineAccount.subscriptionPlan}
        {@const canBuySpryt = planId === 'basic' || planId === 'premium'}
        
        {#if canBuySpryt}
          <button class="bg-green-600 text-white hover:bg-green-700 rounded ml-2 flex items-center justify-center w-16" on:click={onBuySpryt}>
            {$_('toolbar.purchase')}
          </button>
        {/if}
      {/if}
      <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 hbox w-24" on:click={signOut}>
        {$_('ui.signOut')}
      </button>
    </div>
  {/if}
  {#if $onlineStatus === "signed-out"}
    <p class="text-white">{$_('toolbar.signInBonus')}<img src={sprytIcon} alt="spryt" width=24 height=24 class="image-outline"/>{$_('toolbar.sprytBonus')}</p>
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 hbox w-24" on:click={signIn}>
      {$_('ui.signIn')}
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
  .image-outline {
    display: inline;
    filter: drop-shadow(0.5px 0 0 #fff8)
            drop-shadow(-0.5px 0 0 #fff8)
            drop-shadow(0 0.5px 0 #fff8)
            drop-shadow(0 -0.5px 0 #fff8);
  }
</style>
