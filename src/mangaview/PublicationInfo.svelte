<script lang="ts">
  import type { PublicationContent } from '../firebase';

  export let publication: PublicationContent;

  let formattedDate: string;

  $: formattedDate = formatDate(publication.created_at);

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  }
  
</script>

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
</style>