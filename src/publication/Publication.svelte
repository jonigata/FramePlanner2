<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import sprytIcon from '../assets/spryt.webp';
  import { _ } from 'svelte-i18n';

  let title = '';
  let description = '';
  let related_url = '';
  let is_public = true;

  function handleSubmit() {
    $modalStore[0].response!({ title, description, related_url, is_public });
    modalStore.close();
  }

  function handleCancel() {
    $modalStore[0].response!(null);
    modalStore.close();
  }

  function showGuideline() {
    window.open('/postingGuideline.html', '_blank');
  }

</script>

<div class="card p-4 w-full max-w-lg">
  <h2 class="h2 mb-4">{$_('publication.documentPublication')}</h2>
  <p class="inline-flex items-center gap-1">{$_('publication.firstPublicationBonus')}<img src={sprytIcon} alt="spryt" width=24 height=24 class="image-outline"/>{$_('publication.bonusAmount')}</p>
  <form on:submit|preventDefault={handleSubmit}>
    <label class="label">
      <span>{$_('publication.title')}</span>
      <input
        class="input p-2 pl-4 w-full"
        type="text"
        bind:value={title}
        required
        maxlength="100"
      />
    </label>

    <label class="label">
      <span>{$_('publication.public')}</span>
      <input type="checkbox" id="is_public" bind:checked={is_public} class="mr-2" />
    </label>

    <label class="label">
      <span>{$_('publication.description')}</span>
      <textarea
        class="textarea p-2 pl-4 w-full"
        bind:value={description}
        maxlength="500"
        rows="4"
      />
    </label>

    <label class="label">
      <span>{$_('publication.relatedUrl')}</span>
      <input
        class="input p-2 pl-4 w-full"
        type="text"
        bind:value={related_url}
        maxlength="100"
      />
    </label>

    <span>{$_('publication.coverNote')}</span>

    <div class="flex gap-2 mt-4">
      <button type="button" class="btn variant-filled-secondary" on:click={showGuideline}>
        {$_('publication.postingGuideline')}
      </button>
      <div class="flex-grow"></div>
      <button type="button" class="btn variant-ghost" on:click={handleCancel}>
        {$_('publication.cancel')}
      </button>
      <button 
        type="submit" 
        class="btn variant-filled-primary"
        disabled={!title}
      >
        {$_('publication.publish')}
      </button>
    </div>
  </form>
</div>

<style>
  .label {
    display: block;
    margin-bottom: 1rem;
  }

  .label span {
    display: block;
    margin-bottom: 0.25rem;
  }
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>