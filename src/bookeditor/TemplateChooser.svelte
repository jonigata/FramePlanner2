<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
  import { triggerTemplateChoice } from './templateChooserStore';
  import TemplateSample from './TemplateSample.svelte';

  function onClick(key: string) {
    triggerTemplateChoice.resolve(key);
  }

  function onClickAway() {
    triggerTemplateChoice.resolve(null);
  }
</script>

<div class="drawer-outer">
  <Drawer
    open={$triggerTemplateChoice.isActive}
    placement="right"
    size="480px"
    on:clickAway={onClickAway}
  >
    <div class="drawer-content">
    {#each Object.keys(frameExamples) as sampleKey}
      <TemplateSample sample={frameExamples[sampleKey]} on:click={() => onClick(sampleKey)}/>
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