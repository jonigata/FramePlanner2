<script lang="ts">
	import ColorPicker from 'svelte-awesome-color-picker';
  import { ColorHarmonyGenerator } from '../utils/harmony';

  export let color: string;
  export let themeColor: string

  let colors = [
    '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80', '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF', '#FF0080',
  ];

  $: onChangeThemeColor(themeColor);
  function onChangeThemeColor(themeColor) {
    if (!themeColor) {
      return;
    }
    const g = new ColorHarmonyGenerator(themeColor);
    const h = g.generateHarmony();
    colors = Object.values(h);
    if (!colors.includes(color)) {
      color = colors[0];
    }
  }
</script>

<div class="flex flex-row gap-4 items-center mt-2">
  <div class="color-picker">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label class="flex items-center gap-1 flex flex-col">
      <span class="text-xs">テーマ</span>
      <ColorPicker bind:hex={themeColor} label="" />
    </label>
  </div>
  <div class="flex space-x-1">
    {#each colors as c}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="w-6 h-6 rounded cursor-pointer"
        class:ring-2={color === c}
        class:ring-offset-2={color === c}
        style="background-color: {c};"
        on:click={() => color = c}
      />
    {/each}
  </div>
</div>

<style>
  .color-picker :global(.color-picker) {
    width: 40px;
  }
  .color-picker :global(.container .color) {
    width: 35px;
    height: 15px;
    border-radius: 4px;
  }
  .color-picker :global(.container .alpha) {
    width: 35px;
    height: 15px;
    border-radius: 4px;
  }

</style>