<script>
  import { createEventDispatcher } from 'svelte';
  const colors = ['black', 'yellow', 'orange', 'red', 'purple', 'blue', 'cyan'];
  const dispatch = createEventDispatcher();
</script>

<div class="flex space-x-2 mt-2">
  {#each colors as color}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="w-6 h-6 rounded-full cursor-pointer"
      style="background-color: {color};"
      on:click={() => dispatch('color', color)}
    />
  {/each}
</div>
