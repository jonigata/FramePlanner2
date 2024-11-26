<script lang="ts">
  import type { PublicationContent } from "../firebase";

  export let manga: PublicationContent[] = [];

  function onClick(item: PublicationContent) {
    console.log('clicked');
    const url = item.content_url;
    window.open(`/viewer/${item.id}`, '_blank');
  }
</script>

<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
  {#each manga as item (item.id)}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="relative group" on:click={() => onClick(item)}>
      <img
      src={item.thumbnail_url}
      alt={item.title}
      class="w-full aspect-[3/4] object-cover rounded-lg shadow-md group-hover:shadow-xl transition-shadow"
      />
      <div>⭐️<span class="fav">{item.fav_count}</span></div>
      <h5 class="mt-2 text-sm font-medium line-clamp-2">{item.author_display_name}</h5>
      <h4 class="mt-2 text-sm font-medium line-clamp-2">{item.title}</h4>
      <p class="mt-2 text-sm line-clamp-3">{item.description}</p>
    </div>
  {/each}
</div>

<style>
  h5 {
    font-family: '源暎エムゴ';
    font-size: 0.7rem;
    line-height: 0.7rem;
    margin-top: 0;
    color: #666;
  }
  h4 {
    font-family: '源暎エムゴ';
    font-size: 0.9rem;
    margin-top: 0;
  }
  p {
    font-family: '源暎アンチック';
    font-size: 0.7rem;
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 0;
    height: 4rem;
  }
  .fav {
    font-family: '源暎エムゴ';
    font-size: 0.7rem;
    color: #666;
  }
</style>