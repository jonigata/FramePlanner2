<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import PaintCanvas from './painter/PaintCanvas.svelte';
  import { onMount } from 'svelte';

  let pen = { strokeStyle: "black", lineWidth: 5 };

</script>

<div class="page-container">
  <PaintCanvas width={512} height={512} pen={pen}/>

  <div class="toolbox">
    <div class="toolbox-item">
      <div class="vbox">
        <button on:click={() => pen = { strokeStyle: "black", lineWidth: 2}}>
          pen     
        </button> 
      </div>
    </div>
    <div class="toolbox-item">
      <div class="vbox">
        <button on:click={() => pen = { strokeStyle: "blue", lineWidth: 50}}>
          eraser  
        </button> 
      </div>
    </div>
  </div>
</div>

<button class="back-button btn variant-filled-tertiary px-2 py-2" on:click={() => modalStore.close()}>back</button>

<style>
  .page-container {
    width: 100%;
    height: 100%;
    position : relative;
  }
  .back-button {
    position: absolute;
    bottom: 8px;
    right: 8px;
    z-index: 1;
    cursor: pointer;
    color: #fff;
    width: 160px;
  }
  .toolbox {
    position: absolute;
    bottom: 8px;
    left: 8px;
    z-index: 1;
    cursor: pointer;
    width: 320px;
    display: flex;
    flex-direction: row;
  }
  .toolbox-item {
    width: 160px;
    height: 80px;
    background-color: #fff;
    color: #000;
    border-radius: 8px;
    margin-right: 8px;
  }
  button {
    border: none;
    outline: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    transition: all 0.2s ease-in-out;
  }
</style>