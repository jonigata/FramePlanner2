<svelte:options accessors={true} />

<script type="ts">
  import { RangeSlider } from '@skeletonlabs/skeleton';
	import ColorPicker from 'svelte-awesome-color-picker';
  import { createEventDispatcher } from 'svelte';

  export let brush = { strokeStyle: '#000000', lineWidth: 1, selected: false };
  export let label;

  const dispatch = createEventDispatcher();

  function onChoose(e) {
    dispatch('choose', brush);
  }

  function onChange(e) {
    dispatch('change', brush);
  }

  function ignoreClick(e) {
    e.stopPropagation();
  }

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class:variant-filled-primary={brush.selected} class:variant-filled-surface={!brush.selected} class="rounded-container-token vbox tool" on:click={onChoose}>
  <RangeSlider name="outlinewidth" min={1} max={100} step={1} bind:value={brush.lineWidth} on:change={onChange} on:click={ignoreClick}/>
  <div class="hbox gap-0.5">
    <span>{label}</span>
    <span class="brush-color-picker" on:click={ignoreClick}>
      <ColorPicker bind:hex={brush.strokeStyle} label="" on:input={onChange}/>
    </span>
  </div>
</div>

<style>
  .brush-color-picker :global(.color-picker) {
    width: 20px;
  }
  .brush-color-picker :global(.container .color) {
    width: 15px;
    height: 15px;
    border-radius: 4px;
  }
  .brush-color-picker :global(.container .alpha) {
    width: 15px;
    height: 15px;
    border-radius: 4px;
  }
  .tool {
    width: 120px;
  }
</style>