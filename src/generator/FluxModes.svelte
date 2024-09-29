<script lang="ts">
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import type { Mode } from '../utils/feathralImaging';
  import feathralIcon from '../assets/feathral.png';
  import { onMount } from 'svelte';
  import { createPreference } from '../preferences';
  import FeathralCost from '../utils/FeathralCost.svelte';

  export let mode: Mode;
  let internalMode: Mode

  const preference = createPreference<Mode>("imaging", "fluxMode");

  onMount(async () => {
    internalMode = await preference.getOrDefault(mode);
  });

  $: if (internalMode !== undefined) {
    mode = internalMode;
    preference.set(internalMode).then(() => console.log("save done", internalMode));
  }
</script>

<div class="vbox left gap-2 mode">
  <RadioGroup>
    <RadioItem bind:group={internalMode} name={"mode"} value={"schnell"}>
      <div class="flex flex-col items-center">
        <span>Schnell</span>
        <FeathralCost cost={1} showsLabel={false}/>
      </div>      
    </RadioItem>
    <RadioItem bind:group={internalMode} name={"mode"} value={"pro"}>
      <div class="flex flex-col items-center">
        <span>Pro</span>
        <FeathralCost cost={10} showsLabel={false}/>
      </div>
    </RadioItem>
    <RadioItem bind:group={internalMode} name={"mode"} value={"chibi"}>
      <div class="flex flex-col items-center">
        <span>ちび</span>
        <FeathralCost cost={7} showsLabel={false}/>
      </div>
    </RadioItem>
    <RadioItem bind:group={internalMode} name={"mode"} value={"manga"}>
      <div class="flex flex-col items-center">
        <span>まんが</span>
        <FeathralCost cost={7} showsLabel={false}/>
      </div>
    </RadioItem>
  </RadioGroup>
</div>

<style>
  .mode :global(.radio-item) {
    width: 88px;
    font-family: '源暎アンチック';
  }  
</style>

