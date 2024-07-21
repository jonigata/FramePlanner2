<script lang="ts">
	import ColorPicker from 'svelte-awesome-color-picker';
  import { colorPickerStore } from './colorPickerStore';
  import { onMount } from 'svelte';

  let dialogElement: HTMLDivElement;
  let adjustedPosition = { x: 0, y: 0 };
  let dialogVisible = false;

  function onClose(e: MouseEvent) {
    if (e.target !== e.currentTarget) {
      return;
    }
    $colorPickerStore = null;
  }

  function adjustPosition() {
    if (!$colorPickerStore || !dialogElement) return;

    const rect = dialogElement.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Consider the dialog's actual size
    adjustedPosition.x = Math.min(Math.max(0, $colorPickerStore.position.x), windowWidth - rect.width);
    adjustedPosition.y = Math.min(Math.max(0, $colorPickerStore.position.y), windowHeight - rect.height);

    // If the dialog is still outside the viewport, adjust further
    if (adjustedPosition.x + rect.width > windowWidth) {
      adjustedPosition.x = windowWidth - rect.width;
    }
    if (adjustedPosition.y + rect.height > windowHeight) {
      adjustedPosition.y = windowHeight - rect.height;
    }

    // Ensure the position is never negative
    adjustedPosition.x = Math.max(0, adjustedPosition.x);
    adjustedPosition.y = Math.max(0, adjustedPosition.y);
  }

  $: if ($colorPickerStore) {
    // Use setTimeout to ensure the DOM has updated before calculating position
    setTimeout(() => {
      adjustPosition();
      dialogVisible = true;
    }, 0);
  } else {
    dialogVisible = false;
  }

  $: $colorPickerStore?.onUpdate($colorPickerStore.color);

  onMount(() => {
    if (dialogElement && $colorPickerStore) {
      adjustPosition();
    }
  });
</script>

{#if $colorPickerStore}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="overlay" on:click={onClose}>
    <div 
      bind:this={dialogElement}
      class="color-picker-dialog" 
      style="left: {adjustedPosition.x}px; top: {adjustedPosition.y}px; opacity: {dialogVisible ? 1 : 0};"
    >
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
    z-index: 1000;
    transition: opacity 0.1s ease-in-out;
  }
</style>
