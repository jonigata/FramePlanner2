<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { toolTip } from '../utils/passiveToolTipStore';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let icon: string;
  export let alt: string;
  export let hint: string;
  export let origin: string;
  export let location: [number, number];

  const baseUnit = 120;
  const baseGap = 20;
  let unit = baseUnit;
  let gap = baseGap;

  let style = "";

  function onClick(e: MouseEvent) {
    dispatch("click", e);
  }

  function updatePosition() {
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
  }

  function handleResize() {
    if (window.innerWidth <= 640 || window.innerHeight <= 800) {
      unit = 80;
      gap = 10;
    } else {
      unit = baseUnit;
      gap = baseGap;
    }
    updatePosition();
  }

  onMount(() => {
    updatePosition();
    window.addEventListener("resize", handleResize);
  });

  onDestroy(() => {
    window.removeEventListener("resize", handleResize);
  });
</script>

<button style={style} class="variant-ghost-tertiary text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 open-button hbox relative" on:click={onClick}
  use:toolTip={hint}>
  <img src={icon} alt={alt}/>
  <div class="absolute w-full h-full">
    <slot/>
  </div>
</button>

<style>
  .open-button {
    pointer-events: auto;
    position: absolute;
    width: 120px;
    height: 120px;

    @media (max-width: 640px), (max-height: 800px) {
      width: 80px;
      height: 80px;
    }
  }
  img {
    width: 80%;
    height: 80%;
  }
</style>
