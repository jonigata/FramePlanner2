<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from 'svelte';

  export let app;
  export let url;
    
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
  
  <iframe
    title="{app}"
    id='microapp-{app}'
    frameborder='0'
    scrolling='no'
    src={url}
  ></iframe>
  
  
  <style>
      iframe { width: 100%; height:100%; }
  </style>