<script type="ts">
  import { controlPanelOpen } from '../controlpanel/controlPanelStore';
  import BaseRootButton from './BaseRootButton.svelte';
  import rulerIcon from '../assets/ruler.webp';

  function openRuler() {
    $controlPanelOpen = !$controlPanelOpen;
  }
</script>

<BaseRootButton icon={rulerIcon} alt={"ruler"} hint={"版形"} origin={"topleft"} location={[0,0]} on:click={openRuler}/>
