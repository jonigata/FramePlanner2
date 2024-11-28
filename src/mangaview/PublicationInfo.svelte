<script lang="ts">
  import { onMount } from 'svelte';
  import { comment, getComments, setFav, type Comment, type PublicationContent } from '../firebase';

  
  export let publication: PublicationContent;

  let formattedDate: string;
  let comments: Comment[];
  let myComment: string = "";

  $: formattedDate = formatDate(publication.created_at);

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  }

  async function doComment() {
    console.log("doComment", myComment);
    await comment(publication.id, myComment);
    comments = await getComments(publication.id);
  }

  async function onFav() {
    console.log('fav');
    publication.is_faved = !publication.is_faved;
    publication.fav_count += publication.is_faved ? 1 : -1;
    await setFav(publication.id, publication.is_faved);
  }

  async function goHome() {
    window.open(`/farm`, 'frameplanner-farm');
  }

  onMount(async () => {
    comments = await getComments(publication.id);
  });
  
</script>

<button class="btn btn-sm variant-filled w-24 h-8 pl-1" on:click={goHome}>&lt;&lt; ホームへ</button>
<h2>タイトル</h2>
<p>{publication.title}</p>
<h2>作者</h2>
<p>{publication.author_display_name}</p>
<h2>説明</h2>
<p>
  {publication.description}
</p>
<h2>作成日</h2>
<p>{formattedDate}</p>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="fav" on:click={onFav}>
⭐️<span class:favable={publication.is_favable} class:faved={publication.is_faved}>{publication.fav_count}</span>
</div>
<h2>コメント</h2>
{#if comments}
  {#if comments.length == 0}
    <div class="comment">コメントはまだありません</div>
  {:else}
    {#each comments as comment (comment.id)}
      <div class="comment">
        {comment.content}
        <div class="comment-author">{comment.user_display_name}</div>
      </div>
    {/each}
  {/if}
{/if}
<div class="comment">
  <textarea class="textarea" rows="4" cols="50" bind:value={myComment} placeholder="コメントを入力してください"></textarea>
  <button class="btn btn-sm variant-filled h-6" on:click={doComment}>コメント</button>
</div>

<style>
  p {
    font-family: '源暎アンチック';
    margin-left: 16px;
    margin-bottom: 16px;
  }
  h2 {
    font-family: '源暎エムゴ';
    font-size: 1.2rem;
    color: #666;
    margin-bottom: -8px;
  }
  h5 {
    font-family: '源暎エムゴ';
    font-size: 0.7rem;
    color: #666;
    margin-bottom: -8px;
  }
  .fav {
    font-family: '源暎エムゴ';
    font-size: 0.9rem;
    color: #666;
  }
  .favable {
    color: #00f;
  }
  .faved {
    color: #f00;
  }
  .comment {
    font-family: '源暎アンチック';
    font-size: 0.9rem;
    word-wrap: break-word;
    color: #333;
    white-space: pre-wrap;
    margin-left: 16px;
    margin-bottom: 16px;
  }
  .comment-author {
    font-family: '源暎エムゴ';
    font-size: 0.7rem;
    color: #999;
    margin-left: 16px;
    margin-bottom: 16px;
    text-align: right;
  }
</style>