<script lang="ts">
  import { onMount } from "svelte";
  import { fontLoadToken } from "../bookeditor/bookStore";
  import "../box.css";

  type Log = {
    user: 'mascot' | 'user';
    message: string;
  }

  let log: Log[] = [{ user: 'mascot', message: '何について調べますか～？' }];
  let input = "";
  let key=0;

  const handleKeydown = async (e) => {
    if (e.keyCode === 13) {
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      log.push({ user: 'user', message: input });
      input=null;
      key++;
    }
  };  
  
  onMount(() => {
    $fontLoadToken = [{family: "Kaisei Decol", weight: "400"}, {family: "源暎エムゴ", weight: "400"}];
  });
</script>

<div class="timeline-container variant-glass-surface rounded-container-token">
  <div class="timeline rounded-container-token vbox">
    {#key key}
      {#each log as { user, message }, i}
        {#if user === 'mascot'}
          <div class="mascot variant-soft-primary rounded-container-token">{message}</div>
        {/if}
        {#if user === 'user'}
          <div class="user variant-soft-tertiary rounded-container-token">{message}</div>
        {/if}
      {/each}
    {/key}
  </div>
  <textarea class="chat rounded-container-token" rows="4" cols="50" on:keydown={handleKeydown} bind:value={input}/>
</div>

<style>
  .timeline-container {
    position: absolute;
    left: 256px;
    bottom: 0;
  }
  .timeline {
    margin: 8px;
    width: 320px;
    height: 512px;
    background: rgba(var(--color-surface-50) / 1);
    white-space: pre-line;
    text-align: left;
    padding: 4px;
    gap: 2px;
  }
  .chat {
    margin: 8px;
    padding: 4px;
    width: 95%;
    height: 50px;
    background: rgba(var(--color-surface-50) / 1);
    line-height: 1.3;
  }
  .user {
    color: var(--color-primary-50);
    font-family: '源暎エムゴ';
    max-width: 80%;
    word-wrap: break-word;
    padding: 6px;
    align-self: flex-end;
  }
  .mascot {
    color: var(--color-primary-50);
    font-family: 'Kaisei Decol';
    max-width: 80%;
    word-wrap: break-word;
    padding: 6px;
    align-self: flex-start;
  }
</style>