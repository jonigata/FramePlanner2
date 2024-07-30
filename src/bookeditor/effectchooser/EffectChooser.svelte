<script lang="ts">
  import Drawer from '../../utils/Drawer.svelte'
  import { effectChoiceNotifier } from './effectChooserStore';

  const effects = [
    { name: "OutlineEffect", label: "アウトライン" }
  ]

  function onClick(name: string) {
    $effectChoiceNotifier(name);
    $effectChoiceNotifier = null;
  }

  function onClickAway() {
    $effectChoiceNotifier(null);
    $effectChoiceNotifier = null;
  }
</script>

<div class="drawer-outer">
  <Drawer placement="right" open={$effectChoiceNotifier != null} size="300px" on:clickAway={onClickAway}>
    <div class="drawer-content">
      <div class="flex flex-col gap-2 m-2">
        {#each effects as { name, label }}
          <button
            class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 w-fill h-12 flex items-center justify-center gap-2"
            on:click={() => onClick(name)}
          >
            {label}
          </button>
        {/each}
      </div>
    </div>
  </Drawer>
</div>

<style>
  .drawer-content {
    width: 100%;
    height: 100%;
    padding: 16px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>