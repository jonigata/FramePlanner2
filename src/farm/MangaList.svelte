<script lang="ts">
  import type { PublicationContent } from "../firebase";
  import privateIcon from '../assets/farm/private.png';

  export let manga: PublicationContent[] = [];

  function onClick(item: PublicationContent) {
    console.log("clicked");
    const url = item.content_url;
    window.open(`/viewer/${item.id}`, "frameplanner-viewer");
  }

  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  function onEdit(item: PublicationContent) {
    dispatch("edit", item);
  }

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }

  // Sort manga by date
  manga.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Group manga by year and month
  let groupedManga: {
    [year: number]: { [month: number]: PublicationContent[] };
  } = {};

  $: onMangaChanged(manga);
  function onMangaChanged(manga: PublicationContent[]) {
    const g: Record<number, Record<number, PublicationContent[]>> = {};
    manga.forEach((item) => {
      const date = new Date(item.created_at);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      if (!g[year]) {
        g[year] = {};
      }
      if (!g[year][month]) {
        g[year][month] = [];
      }
      g[year][month].push(item);
    });

    Object.keys(g).forEach((yearStr) => {
      const year = Number(yearStr);
      Object.keys(g[year]).forEach((monthStr) => {
        const month = Number(monthStr);
        g[year][month].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    });

    groupedManga = g;
  }
</script>

<div class="flex flex-col gap-4">
  {#each Object.keys(groupedManga).toReversed() as year}
    <h2 class="text-lg font-bold">{year}年</h2>
    {#each Object.keys(groupedManga[Number(year)]).toReversed() as month}
      <h3 class="text-md font-semibold ml-4">{month}月</h3>
      {#each groupedManga[Number(year)][Number(month)] as item}
        <div class="flex items-start gap-4 ml-8">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <img
            src={item.thumbnail_url}
            alt={item.title}
            class="w-24 h-32 object-cover rounded-lg shadow-md"
            on:click={() => onClick(item)}
          />
          <div class="flex flex-col justify-between flex-grow h-32">
            <div class="flex-grow">
              <div class="flex">
                <h4 class="text-xs text-gray-600">{item.title}</h4>
                <h5 class="text-xs text-gray-600 ml-2">
                  {formatDate(item.created_at)}
                  ⭐️<span class="fav">{item.fav_count}</span>
                  {#if !item.is_public}
                    <img src={privateIcon} alt="Private" class="w-6 h-6 inline-block ml-1" />
                  {/if}
                </h5>
              </div>
              <p class="text-xs text-gray-800 mt-2 mb-2 line-clamp-3">
                {item.description}
              </p>
              <button
              type="button"
              class="btn btn-sm w-12 h-6 variant-filled-secondary"
              on:click={() => onEdit(item)}>編集</button
            >
            </div>
          </div>
        </div>
      {/each}
    {/each}
  {/each}
  <div class="h-24"></div>
</div>

<style>
  h2 {
    font-family: "源暎エムゴ";
    font-size: 1.4rem;
    margin-bottom: -12px;
  }
  h3 {
    font-family: "源暎エムゴ";
    font-size: 1.2rem;
    margin-bottom: -8px;
  }
  h5 {
    font-family: "源暎エムゴ";
    font-size: 0.7rem;
    color: #666;
    margin-bottom: -8px;
  }
  h4 {
    font-family: "源暎エムゴ";
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
  }
  .fav {
    font-family: '源暎エムゴ';
    font-size: 0.7rem;
    color: #666;
  }
</style>
