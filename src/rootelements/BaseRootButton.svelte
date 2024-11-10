<script lang="ts">
  import { onMount } from 'svelte';
  import { toolTip } from '../utils/passiveToolTipStore';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let icon: string;
  export let alt: string;
  export let hint: string;
  export let origin: string;
  export let location: [number, number];

  const unit = 120;
  const gap = 20;

  let style = "";

  function onClick() {
    dispatch("click");
  }

  onMount(() => {
    const [x, y] = location;
    const u = unit + gap;
    let positionStyle = "";
    switch(origin) {
      case "topleft":
        positionStyle = `left: ${gap + x * u}px; top: ${gap + y * u}px;`;
        break;
      case "topright":
        positionStyle = `right: ${gap + x * u}px; top: ${gap + y * u}px;`;
        break;
      case "bottomleft":
        positionStyle = `left: ${gap + x * u}px; bottom: ${gap + y * u}px;`;
        break;
      case "bottomright":
        positionStyle = `right: ${gap + x * u}px; bottom: ${gap + y * u}px;`;
        break;
    }
    style = positionStyle;
    console.log("style", style);
  });

</script>

<button style={style} class="variant-ghost-tertiary text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 open-button hbox" on:click={onClick}
  use:toolTip={hint}>
  <img src={icon} alt={alt}/>
</button>

<style>
  .open-button {
    pointer-events: auto;
    position: absolute;
    width: 120px;
    height: 120px;
  }
  img {
    width: 80%;
    height: 80%;
  }
</style>
