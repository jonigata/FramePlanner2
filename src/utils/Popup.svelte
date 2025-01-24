<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';

  export let show = false;
  export let target: HTMLElement;

  const dispatch = createEventDispatcher();
  let popup: HTMLDivElement;
  let rect: DOMRect;

  function updatePosition() {
    if (!target || !popup) return;
    rect = target.getBoundingClientRect();
    const popupWidth = popup.offsetWidth;
    popup.style.top = `${rect.bottom}px`;
    popup.style.left = `${rect.right - popupWidth}px`;

    // 画面左端からはみ出す場合は左端に合わせる
    const left = parseInt(popup.style.left);
    if (left < 0) {
      popup.style.left = '0px';
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (show && !popup.contains(event.target as Node) && event.target !== target) {
      dispatch('close');
    }
  }

  $: if (show) {
    setTimeout(updatePosition, 0);
  }

  onMount(() => {
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('click', handleClickOutside, true);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('click', handleClickOutside, true);
    };
  });
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    bind:this={popup} 
    class="popup"
    on:click|stopPropagation
  >
    <slot />
  </div>
{/if}

<style>
  .popup {
    position: fixed;
    z-index: 1000;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    min-width: 150px;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>