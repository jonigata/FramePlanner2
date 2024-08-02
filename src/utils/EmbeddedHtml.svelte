<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from 'svelte';

  export let app;
  export let url;
  export let reload: boolean;

  let key = 0;

  $: if (reload) {
    console.log("reloading");
    reload = false;
    key++;
  }
    
  onMount(() => {
    console.log(`Mounted ${app}`);
  });
  
  afterUpdate(() => {
    console.log(`Updated ${app}`);
  });
  
  onDestroy(() => {
    console.log(`Destroyed ${app}`);
  });
</script>

{#key key}
  <iframe
    title="{app}"
    id='microapp-{app}'
    frameborder='0'
    scrolling='no'
    src={url}
  ></iframe>
{/key}  
  
  <style>
      iframe { width: 100%; height:100%; }
  </style>