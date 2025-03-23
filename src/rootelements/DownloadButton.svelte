<script type="ts">
  import { downloaderOpen } from '../downloader/downloaderStore';
  import BaseRootButton from './BaseRootButton.svelte';
  import downloadIcon from '../assets/download.webp';

  function download() {
    $downloaderOpen = !$downloaderOpen;
  }
</script>

<BaseRootButton icon={downloadIcon} alt={"download"} hint={"ダウンロード"} origin={"topright"} location={[0,0]} on:click={download}/>
