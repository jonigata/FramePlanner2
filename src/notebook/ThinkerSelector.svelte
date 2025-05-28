<script lang="ts">
  import { type Thinker } from "$protocolTypes/adviseTypes.d";

  export let thinker: Thinker;
  
  const thinkerOptions = [
    { value: "gpt4o", label: "gpt4o" },
    { value: "gpt4.1", label: "gpt4.1" },
    { value: "gpt4.1-mini", label: "gpt4.1-mini" },
    { value: "o4-mini", label: "o4-mini" },
    // { value: "sonnet", label: "sonnet" },
    // { value: "sonnet:think", label: "sonnet(think)" },
    { value: "sonnet", label: "sonnet-4.0" },
    // { value: "gemini", label: "gemini" },
    { value: "gemini-flash", label: "gemini-flash" },
    // { value: "gemini-flash:think", label: "gemini-flash(think)" },
    { value: "grok3", label: "grok3" }
  ];
</script>

<select bind:value={thinker} name="mode" class="p-2 border rounded bg-white text-black">
  {#each thinkerOptions as option}
    <option value={option.value}>{option.label}</option>
  {/each}
</select>
