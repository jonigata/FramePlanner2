<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  import { onMount } from "svelte";
  import { updatePublication, getMails, adminSendMail, type PublicationContent, type Mail } from "../firebase";
  import { onlineProfile } from '../utils/accountStore';
  import MangaList from './MangaList.svelte';
  import EditManga from './EditManga.svelte';

  export let username: string;
  export let manga: PublicationContent[] = [];

  let selectedManga: PublicationContent | null = null;
  let mails: Mail[] = [];

  function onEdit(e: CustomEvent) {
    selectedManga = e.detail;
  }

  async function onCommit() {
    console.log("Commit", selectedManga);
    const p = selectedManga!;
    await updatePublication(p.id, p.title, p.description, p.related_url, p.is_public);
    selectedManga = null;
    manga = manga;
  }

  onMount(async () => {
    console.log("username", username);
    mails = await getMails();
  });
</script>


{#if $onlineProfile && $onlineProfile.is_admin}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <span class="chip variant-filled-surface">あなたはadminです</span>
{/if}

<div class="flex flex-row gap-4">
  <!-- Left Pane: User Info -->
  <div class="w-1/3">
    <h2 class="text-xl font-bold mb-4">あなたの情報</h2>
    <h5>ユーザID</h5>
    <p>{username}</p>
    <h5>ユーザ名</h5>
    <p>{$onlineProfile?.display_name}</p>
    <h5>プロフィール</h5>
    <p>{$onlineProfile?.bio}</p>
  </div>

  <!-- Right Pane: Notifications -->
  <div class="w-2/3 self-start">
    <h2>お知らせ</h2>
    {#if mails.length == 0}
      <p>特にありません</p>
    {:else}
      <table class="table w-full max-w-[calc(100%-48px)]">
        <thead>
          <tr>
            <th class="w-[50px]">既読</th>
            <th>タイトル</th>
            <th class="w-[90px]">日付</th>
          </tr>
        </thead>
        <tbody>
          {#each mails as mail (mail.id)}
          <tr>
            <td class="text-center">{mail.read_at == null ? '-' : '✓'}</td>
            <td>{mail.title || 'タイトルなし'}</td>
            <td>{new Date(mail.created_at).toLocaleDateString()}</td>
          </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<div class="h-12"/>

<h1 class="text-xl font-bold mb-4">あなたの投稿</h1>

<div class="flex flex-row gap-4 overflow-hidden h-full">
  <!-- Left Pane -->
  <div class="flex flex-col gap-4 overflow-y-auto w-1/2 h-full">
    <section>
      <MangaList manga={manga} isMine={true} on:edit={onEdit}/>
    </section>
  </div>

  <!-- Right Pane -->
  <div class="flex flex-col gap-4 w-1/2 p-4 overflow-y-auto">
    {#if selectedManga}
      <EditManga {selectedManga} {onCommit} />
    {/if}
  </div>
</div>

<style>
  .table {
    margin-top: 8px;
    margin-bottom: 8px;
    margin-left: 24px;
    margin-right: 24px;
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
    margin-bottom: -4px;
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
    padding-bottom: 4px;
  }
</style>
