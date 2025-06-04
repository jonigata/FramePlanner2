<script type="ts">
  import { controlPanelOpen } from '../controlpanel/controlPanelStore';
  import BaseRootButton from './BaseRootButton.svelte';
  import rulerIcon from '../assets/ruler.webp';
  import { _ } from 'svelte-i18n';

  function openRuler() {
    $controlPanelOpen = !$controlPanelOpen;
  }
</script>

<BaseRootButton icon={rulerIcon} alt={"ruler"} hint={$_('ui.ruler')} origin={"topleft"} location={[0,0]} on:click={openRuler}/>
