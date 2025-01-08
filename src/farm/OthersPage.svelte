<script lang="ts">
  import { onMount } from "svelte";
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  import { adminSendMail, getProfile, type PublicationContent, type UserProfile } from "../firebase";
  import { onlineProfile } from '../utils/accountStore';
  import MangaList from './MangaList.svelte';

  export let username: string;
  export let manga: PublicationContent[] = [];

  let profile: UserProfile | null = null;

  async function onMail() {
    console.log("Mail to", username);
    await adminSendMail(username!, "タイトル", "本文");
    console.log("Mail sent");
  }

  onMount(async () => {
    console.log("username", username);
    profile = await getProfile(username);
  });

</script>

{#if $onlineProfile && $onlineProfile.is_admin}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <span class="chip variant-filled-surface" on:click={() => onMail()}>admin: {username}にメールを出す</span>
{/if}

<div class="container mx-auto px-4 py-6 w-[800px] flex-grow flex flex-col overflow-hidden">
  <div class="flex items-center gap-2">
    <h2 class="text-xl font-bold">{profile?.display_name ?? ''}</h2>
    <div class="flex flex-col">
      <h5>@{username}</h5>
      {#if profile?.related_url}
        <a href={profile?.related_url} target="_blank">{profile?.related_url}</a>
      {/if}
    </div>
  </div>
  <p>{profile?.bio ?? ''}</p>

  <h2 class="text-xl font-bold mb-4">{profile?.display_name ?? ''}の投稿</h2>

  <div class="flex flex-row gap-4 overflow-hidden h-full">
    <!-- Left Pane -->
    <div class="flex flex-col gap-4 overflow-y-auto w-1/2 h-full">
      <section>
        <MangaList manga={manga} isMine={false}/>
      </section>
    </div>
  </div>
</div>

<style>
  .table {
    margin-top: 8px;
    margin-bottom: 8px;
    margin-left: 24px;
  }
  .table thead th {
    padding: 2px;
    padding-left: 8px;
    font-family: '源暎エムゴ';
  }
  .table tbody td {
    padding: 2px;
    padding-left: 8px;
    font-family: '源暎アンチック';
    text-overflow: ellipsis;
  }
  h1 {
    font-family: '源暎エムゴ';
    font-size: 1.7rem;
  }
  h2 {
    font-family: "源暎エムゴ";
    font-size: 1.4rem;
    margin-top: 12px;
  }
  h5 {
    font-family: "源暎エムゴ";
    font-size: 0.7rem;
    color: #666;
    margin-bottom: -8px;
  }
  p {
    font-family: '源暎アンチック';
    font-size: 1.0rem;
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 8px;
    margin-left: 8px;
    margin-bottom: 16px;
  }
</style>