<script>
  import { EASINGS } from './easing';

  export let value = 'linear';
</script>

<!-- svelte-ignore a11y-label-has-associated-control -->
<label class="text-sm font-medium w-24">イージング</label>
<select class="select">
  {#each Object.keys(EASINGS) as easing}
    <option value={easing} on:click={() => value = easing}>{easing}</option>
  {/each}
</select>
