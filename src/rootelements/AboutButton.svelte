<script lang="ts">
  import { aboutOpen } from '../about/aboutStore';
  import aboutIcon from '../assets/about.webp';
  import BaseRootButton from './BaseRootButton.svelte';
  import { _ } from 'svelte-i18n';

  function download() {
    $aboutOpen = !$aboutOpen;
  }
</script>

<BaseRootButton icon={aboutIcon} alt={"about"} hint={$_('ui.about')} origin={"topleft"} location={[0,1]} on:click={download}/>
