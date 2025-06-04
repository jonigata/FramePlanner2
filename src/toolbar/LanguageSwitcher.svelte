<script lang="ts">
  import { currentLocale, availableLocales, localeLabels, type Locale } from '../stores/i18n';
  
  let isOpen = false;
  
  function switchLocale(locale: Locale) {
    currentLocale.set(locale);
    isOpen = false;
  }
  
  function toggleDropdown() {
    isOpen = !isOpen;
  }
</script>

<div class="relative">
  <button 
    class="flex items-center px-2 py-1 text-sm bg-surface-700 text-white border border-surface-500 rounded hover:bg-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
    on:click={toggleDropdown}
  >
    <span class="mr-1">🌐</span>
    <span>{localeLabels[$currentLocale]}</span>
    <svg class="w-4 h-4 ml-1 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>
  
  {#if isOpen}
    <div class="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[120px]">
      {#each availableLocales as locale}
        <button
          class="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 {$currentLocale === locale ? 'bg-blue-50 text-blue-700' : ''}"
          on:click={() => switchLocale(locale)}
        >
          {localeLabels[locale]}
        </button>
      {/each}
    </div>
  {/if}
</div>

<!-- Close dropdown when clicking outside -->
{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="fixed inset-0 z-40" 
    on:click={() => isOpen = false}
  ></div>
{/if}