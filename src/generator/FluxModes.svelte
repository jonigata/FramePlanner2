<script lang="ts">
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import type { Mode } from '../utils/feathralImaging';
  import feathralIcon from '../assets/feathral.png';
  
  export let mode: Mode
</script>

<div class="vbox left gap-2 mode">
  <RadioGroup>
    <RadioItem bind:group={mode} name={"mode"} value={"schnell"}>
      <span class="w-64">Schnell</span>
      <span class="w-64 flex"><img class="inline" src={feathralIcon} alt="feathral" width=24 height=24/>x1</span>
    </RadioItem>
    <RadioItem bind:group={mode} name={"mode"} value={"pro"}>
      <span class="w-64">Pro</span>
      <span class="w-64 flex"><img class="inline" src={feathralIcon} alt="feathral" width=24 height=24/>x10</span>
    </RadioItem>
    <RadioItem bind:group={mode} name={"mode"} value={"chibi"}>
      <span class="w-64">ちび</span>
      <span class="w-64 flex"><img class="inline" src={feathralIcon} alt="feathral" width=24 height=24/>x7</span>
    </RadioItem>
    <RadioItem bind:group={mode} name={"mode"} value={"manga"}>
      <span class="w-64">まんが</span>
      <span class="w-64 flex"><img class="inline" src={feathralIcon} alt="feathral" width=24 height=24/>x7</span>
    </RadioItem>
  </RadioGroup>
</div>

<style>
  .mode :global(.radio-item) {
    width: 80px;
  }  
</style>

