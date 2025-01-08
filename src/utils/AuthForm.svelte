<script lang="ts">
  import { authStore, type Provider } from '../utils/accountStore';
  import googleIcon from '../assets/auth/google.svg'
  import githubIcon from '../assets/auth/github.svg'
  import { modalStore } from '@skeletonlabs/skeleton';
  import { developmentFlag } from "./developmentFlagStore";

  let email = '';
  let password = '';
  let error: string | null = null;
  let isSignupComplete = false;

  async function handleEmailSignin(e: SubmitEvent) {
    e.preventDefault();
    try {
      await authStore.signInWithEmail(email, password);
      modalStore.close();
    } catch (err: any) {
      error = err.message;
    }
  }

  async function handleEmailSignup(e: MouseEvent) {
    e.preventDefault();
    try {
      await authStore.signUpWithEmail(email, password);
      isSignupComplete = true;
    } catch (err: any) {
      error = err.message;
    }
  }

  async function handleOAuth(provider: Provider) {
    try {
      await authStore.signIn(provider);
    } catch (err: any) {
      error = err.message;
    }
  }

  function handleClose() {
    modalStore.close();
  }
</script>

<div class="max-w-md mx-auto mt-10 p-6 bg-white rounded-md shadow-md">
  {#if isSignupComplete}
    <div class="text-center space-y-4">
      <h2 class="text-2xl font-bold">Check your email</h2>
      <p>We've sent a confirmation link to:</p>
      <p class="font-semibold">{email}</p>
      <p>Please click the link to complete your registration.</p>
      <button class="btn variant-filled-primary w-full !rounded" on:click={handleClose}>
        Close
      </button>
    </div>
  {:else}
    <h2 class="text-2xl font-bold mb-6 text-center">ログイン</h2>

    {#if $developmentFlag}
      <form on:submit={handleEmailSignin} class="space-y-4">
        <input 
          name="email" 
          class="input w-full p-2 !rounded" 
          placeholder="Email" 
          type="email" 
          bind:value={email}
          required
        />
        <input 
          name="password" 
          class="input w-full p-2 !rounded" 
          placeholder="Password" 
          type="password"
          bind:value={password}
          required
          minlength="8"
        />
        <div class="flex space-x-4">
          <button type="submit" class="btn variant-filled-primary w-full !rounded">Login</button>
          <button type="submit" on:click|preventDefault={handleEmailSignup} class="btn variant-filled-secondary w-full !rounded">Signup</button>
        </div>
      </form>
      <h3 class="text-xl font-semibold text-center mt-6">Or login with</h3>
    {/if}

    <div>
      <div class="space-y-4 mt-4">
        <button 
          on:click={() => handleOAuth('github')} 
          class="btn variant-filled w-full flex items-center justify-center !rounded"
        >
          <img src={githubIcon} alt="Github" class="w-5 h-5 mr-2" />
          Login with Github
        </button>
        <button 
          on:click={() => handleOAuth('google')} 
          class="btn variant-filled w-full flex items-center justify-center !rounded"
        >
          <img src={googleIcon} alt="Google" class="w-5 h-5 mr-2" />
          Login with Google
        </button>
      </div>
    </div>

    {#if error}
      <p class="mt-4 text-error-500 text-center">{error}</p>
    {/if}
  {/if}
</div>

<style>
  :global(.max-w-md) {
    max-width: 28rem;
  }
</style>