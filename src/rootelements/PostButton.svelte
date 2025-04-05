<script lang="ts">
  import BaseRootButton from './BaseRootButton.svelte';
  import { analyticsEvent } from "../utils/analyticsEvent";
  import { bookArchiver } from "../utils/bookArchiverStore";

  import postIcon from '../assets/post.webp';

  function postBook() {
    console.log("postBook");
    analyticsEvent('publish_envelop');
    $bookArchiver = $bookArchiver.concat(['publish']);
  }
</script>

<BaseRootButton icon={postIcon} alt={"post"} hint={"まんがファーム！に投稿"} origin={"topright"} location={[0,1]} on:click={postBook}/>
