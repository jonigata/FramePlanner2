<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  import { onMount } from "svelte";
  import { getWorks, updatePublication, getMails, adminSendMail, type PublicationContent, type Mail } from "../firebase";
  import { onlineProfile } from '../utils/accountStore';
  import MangaList from './MangaList.svelte';
  import EditManga from './EditManga.svelte';

  export let username: string | null = null;

  let isMine = false;
  let manga: PublicationContent[] = [];
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

  async function onMail() {
    console.log("Mail to", username);
    await adminSendMail(username!, "タイトル", "本文");
    console.log("Mail sent");
  }

  onMount(async () => {
    console.log("username", username);
    const works = await getWorks(username);
    manga = works.works;
    isMine = works.isMine;
    console.log("Manga", manga);
    if (isMine) {
      mails = await getMails();
    }
  });
</script>

<div class="container mx-auto px-4 py-6 w-[800px] flex-grow flex flex-col overflow-hidden">
  {#if isMine}
    <h1 class="text-xl font-bold mb-4">あなたの投稿</h1>
  {:else}
    <h1 class="text-xl font-bold mb-4">{username ?? 'あなた'}の投稿</h1>
  {/if}

  <div class="flex flex-row gap-4 overflow-hidden h-full">
    <!-- Left Pane -->
    <div class="flex flex-col gap-4 overflow-y-auto w-1/2 h-full">
      <section>
        {#if $onlineProfile && $onlineProfile.is_admin}
          {#if username == $onlineProfile.username}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span class="chip variant-filled-surface">あなたはadminです</span>
          {:else}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span class="chip variant-filled-surface" on:click={() => onMail()}>admin: {username}にメールを出す</span>
          {/if}
        {/if}
        {#if isMine}
          <h2>お知らせ</h2>
          {#if mails.length == 0}
            <p>特にありません</p>
          {:else}
            <table class="table w-[320px]">
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
        {/if}
        <MangaList manga={manga} isMine={isMine} on:edit={onEdit}/>
      </section>
    </div>

    <!-- Right Pane -->
    <div class="flex flex-col gap-4 w-1/2 p-4 overflow-y-auto">
      {#if selectedManga}
        <EditManga {selectedManga} {onCommit} />
      {/if}
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
    margin-bottom: -12px;
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