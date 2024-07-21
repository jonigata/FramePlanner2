<script lang="ts">
	import ColorPicker from 'svelte-awesome-color-picker';
  import { colorPickerStore } from './colorPickerStore';

  function onClose(e: MouseEvent) {
    if (e.target !== e.currentTarget) {
      return;
    }
    $colorPickerStore = null;
  }

  $: $colorPickerStore?.onUpdate($colorPickerStore.color);

</script>

{#if $colorPickerStore}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="overlay" on:click={onClose}>
    <div class="color-picker-dialog" style="left: {$colorPickerStore.position.x}px; top: {$colorPickerStore.position.x}px;">
      <ColorPicker bind:hex={$colorPickerStore.color} isDialog={false}/>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
  }
  .color-picker-dialog {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 1000;
  }
</style>