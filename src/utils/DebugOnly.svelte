<script lang="ts">
  import { developmentFlag } from "./developmentFlagStore";
</script>

{#if $developmentFlag}
  <slot/>
{/if}
