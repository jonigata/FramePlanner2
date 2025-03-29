<script lang="ts">
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { type Thinker } from "$protocolTypes/adviseTypes.d";

  export let thinker: Thinker;
</script>

<RadioGroup>
  <RadioItem bind:group={thinker} name={"mode"} value={"sonnet"}>
    <div class="flex flex-col items-center">
      <span>sonnet</span>
    </div>      
  </RadioItem>
  <RadioItem bind:group={thinker} name={"mode"} value={"sonnet:think"}>
    <div class="flex flex-col items-center">
      <span>sonnet(think)</span>
    </div>
  </RadioItem>
  <!--
  <RadioItem bind:group={thinker} name={"mode"} value={"gpt4o"}>
    <div class="flex flex-col items-center">
      <span>gpt4o</span>
    </div>
  </RadioItem>
  <RadioItem bind:group={thinker} name={"mode"} value={"o1"}>
    <div class="flex flex-col items-center">
      <span>o1</span>
    </div>
  </RadioItem>
  <RadioItem bind:group={thinker} name={"mode"} value={"gemini"}>
    <div class="flex flex-col items-center">
      <span>gemini</span>
    </div>
  </RadioItem>
  -->
</RadioGroup>
