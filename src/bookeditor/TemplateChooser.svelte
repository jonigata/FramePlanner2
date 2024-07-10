<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
  import { triggerTemplateChoise } from './templateChooserStore';
  import TemplateSample from './TemplateSample.svelte';

  function onClick(index: number) {
    triggerTemplateChoise.resolve(index);
  }

  function onClickAway() {
    triggerTemplateChoise.resolve(null);
  }
</script>

<div class="drawer-outer">
  <Drawer
    open={$triggerTemplateChoise.isActive}
    placement="right"
    size="480px"
    on:clickAway={onClickAway}
  >
    <div class="drawer-content">
    {#each frameExamples as sample, index}
      <TemplateSample sample={sample} on:click={() => onClick(index)}/>
    {/each}
  </div>
</Drawer>
</div>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .drawer-content {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 16px;
  }
</style>