<script lang="ts">
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import aiPictorsIcon from '../assets/aipictors_logo_0.webp';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { onlineAccount } from '../utils/accountStore';
  import { contact } from '../supabase';

  let contactText = "";

  function showComic() {
    const d: ModalSettings = {
      type: 'component',
      component: 'comic',
    };
    modalStore.trigger(d);    
  }

  function showLicense() {
    const d: ModalSettings = {
      type: 'component',
      component: 'license',
    };
    modalStore.trigger(d);    
  }
  
  async function doContact() {
    console.log(contactText);
    if (contactText == null || contactText == "") {
      toastStore.trigger({ message: 'Please enter your request', timeout: 1500});
      return;
    }
    if (contactText === "throw error") {
      throw new Error("intentional error");
    }
    try {
      await contact({message:contactText});
      toastStore.trigger({ message: 'Request submitted successfully', timeout: 1500});
      contactText = "";
    }
    catch (e) {
      toastStore.trigger({ message: 'Failed to submit request', timeout: 1500});
      console.log(e);
    }
  }
</script>

<div>
  <h2>FramePlanner</h2>

  <h3>Introduction & Tutorials</h3>
  <p>
    <a href="https://www.youtube.com/channel/UC3kZKl2Q5IvlFKnJ8RHKBGw">Youtube Movie Manual</a>
  </p>
  <p>
    <a href="https://blogcake.net/ai-comic/" target="_blank" rel="noopener noreferrer">How to Create Comics with AI using FramePlanner</a>
  </p>
  <p>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <span class="comic-link" on:click={showComic}>FramePlanner for Beginners (Comic Tutorial!)</span> (<a href="https://twitter.com/aiai61555228" target="_blank" rel="noopener noreferer">@aiai61555228</a>)
  </p>

  <h3>Gallery</h3>
  <p class="inline-elements">
    <a href="https://www.aipictors.com/tags/frameplanner?orderBy=LIKES_COUNT&sort=DESC&page=0&prompt=0
    https://www.aipictors.com/search/?tag=frameplanner" target="_blank" rel="noopener noreferrer">
      <img width=110 src={aiPictorsIcon} alt="aipictors"/>
    </a>
    <a href="https://www.chichi-pui.com/posts/tags/FramePlanner/" target="_blank" rel="noopener noreferrer">ChichiPui</a>
    <a href="https://twitter.com/hashtag/frameplanner?src=hashtag_click&f=live" target="_blank" rel="noopener noreferrer">#frameplanner(Twitter)</a>
  </p>

  <h3>Resources</h3>
  <p>
    <a href="https://github.com/jonigata/FramePlanner2" target="_blank" rel="noopener noreferrer">GitHub</a>
    <a href="https://twitter.com/jonigata_ai" target="_blank" rel="noopener noreferrer">Twitter</a>
    <a href="https://t.co/UC3jJOJJtS" target="_blank" rel="noopener noreferrer">Anonymous Request</a>
  </p>

  <h2>Cheat Sheet</h2>
  <p>※ Hide inspector before using letter key + click combinations</p>

  <h3>Overall View</h3>
  <p>Space+Drag: Scroll (Hand Tool)</p>
  <p>Right Drag: Scroll (Hand Tool)</p>
  <p>Wheel: Zoom</p>
  <p>Undo/Redo: Ctrl+Z/Shift+Ctrl+Z</p>

  <h3>Panels & Images</h3>
  <p>Drop Image: Insert into panel</p>
  <p>Q+Click: Delete panel</p>
  <p>W+Click: Split horizontally</p> 
  <p>S+Click: Split vertically</p> 
  <p>D+Click: Delete image</p>
  <p>T+Click: Flip image horizontally</p>
  <p>Y+Click: Flip image vertically</p>
  <p>E+Click: Fit image to panel</p>
  <p>B+Drag: Change padding</p>
<br/>
  <p>Drag: Move image (+Shift to fit while moving)</p>
  <p>Ctrl+Drag: Scale image (+Shift to fit while scaling)</p>
  <p>Alt+Drag: Rotate image</p>

  <h3>Panel Borders</h3>
  <p>Ctrl+Drag: Change thickness</p>
  <p>Shift+Drag: Change angle (Hold Alt for 15-degree increments)</p>
  <p>※ Use extreme angles at your own risk</p>
  <p>T+Click: Flip split direction</p>

  <h3>Speech Bubbles</h3>
  <p>Alt+Drag: Move bubble</p>
  <p>F+Drag: Create bubble</p>
  <p>G+Drag: Create with transparent background</p>
  <p>Double-click empty area: Create bubble</p>
  <p>Double-click bubble: Auto-resize</p>
  <p>Q+Click: Delete bubble</p>
  <p>S+Drag (drop on target): Copy style</p>
  <p>Drop image on bubble: Convert to image bubble</p>
  <p>Paste text: Create bubble</p>
  <p>Paste multi-line text: Create multiple bubbles</p>
  <p>Shift+Enter in inspector text: Split at cursor</p>

  <h3>Image Bubbles</h3>
  <p>Drag: Move</p>
  <p>Ctrl+Drag: Scale</p>
  <p>Drop image on bubble icon (top-left): Create</p>
  <p>Paste image: Create</p>

  <h3>SD-WebUI Integration</h3>
  <dl>
    <dt>Enable API & CORS</dt>
    <dd>When starting SD-WebUI, add '--api --cors-allow-origins https://frameplanner-e5569.web.app' to COMMANDLINE_ARGS</dd>
    <dt>Mixed Content Solution</dt>
    <dd>Choose one of the following:
      <ol>
        <li>Host SD-WebUI with HTTPS</li>
        <li>Use ngrok or similar with SD-WebUI</li>
        <li><a href="https://t.co/m48tNsHWzB">Relax browser security settings</a></li>
      </ol>
    </dd>
    <dt>URL Input</dt>
    <dd>Click the "+" button in any panel or bubble's layer list. When the image generation panel appears on the right, select the "Stable Diffusion" tab and enter your SD-WebUI URL in the "URL" field</dd>
    <dt>Scribble</dt>
    <dd><a href="https://twitter.com/jonigata_ai/status/1659567680695992320">Demo Video (Twitter)</a></dd>
  </dl>

  <h2>Q&A</h2>
  <dl>
    <dt>Q. I blocked "Use clipboard" but want to enable it</dt>
    <dd>A. Go to your browser's site-specific security settings and select "Allow". You can usually access this through the lock icon in the URL bar.</dd>
    <dt>Q. How to change bubble transparency?</dt>
    <dd>A. In the bubble inspector, find the color settings near the bottom. Click to open the color picker, then adjust the transparency slider on the right side.</dd>
  </dl>

  <h2>Notice</h2>
  <ul>
    <li>Documents created with the Share feature may be deleted without notice</li>
  </ul>

  <h2>License</h2>
  <p>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <span class="comic-link" on:click={showLicense}>License</span>
  </p>

  {#if $onlineAccount}
  <h2>Contact</h2>
  <div class="hbox mx-2" style="margin-top: 4px;">
    <textarea class="mx-2 my-2 rounded-container-token grow textarea" bind:value={contactText}></textarea>
    <button class="btn btn-sm variant-filled paper-size"  on:click={doContact}>Send</button>
  </div>
  {/if}
</div>

<style>
  h2 {
    font-family: 'Yu Gothic', sans-serif;
    font-size: 24px;
    margin-top: 16px;
    font-weight: 600;
  }
  h3 { 
    font-family: 'Yu Gothic', sans-serif;
    font-size: 18px;
    margin-top: 8px;
    font-weight: 500;
  }
  p {
    font-family: 'Yu Gothic', sans-serif;
    margin-left: 32px;
  }
  dt {
    font-weight: 700;
    margin-top: 8px;
    margin-left: 16px;
  }
  dd {
    margin-left: 32px;
  }
  ul {
    margin-left: 32px;
  }
  ol {
    margin-left: 32px;
  }
  ol li {
    list-style-type: none;
    counter-increment: cnt;
  }
  ol li::before {
    content: counter(cnt)". ";
  }
  .comic-link {
    cursor: pointer;
    text-decoration: underline;
    color: #0000ff;
  }
  .inline-elements * {
    display: inline-block;
    vertical-align: middle;
  }
</style>