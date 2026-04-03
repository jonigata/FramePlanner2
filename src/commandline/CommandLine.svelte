<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { commandLineVisible } from './commandLineStore';
  import { commandTable, buildUsage, argTypeCandidates } from './commandDefinitions';

  let inputElement: HTMLInputElement;
  let inputValue = '';
  let selectedIndex = 0;

  interface Candidate {
    text: string;
    kind: 'command' | 'arg';
    description: string;
  }

  function getCandidates(input: string): Candidate[] {
    const defs = commandTable;
    const parts = input.split(/\s+/);
    const commandPart = parts[0] || '';
    const hasSpace = input.includes(' ');

    if (!hasSpace) {
      return defs
        .filter(d => d.name.includes(commandPart))
        .map(d => ({ text: d.name, kind: 'command' as const, description: d.description }));
    }

    const matchedDef = defs.find(d => d.name === commandPart);
    if (!matchedDef) return [];

    // 現在入力中の引数のインデックス
    const argIndex = parts.length - 2;
    const argSpec = matchedDef.args[argIndex];
    if (!argSpec) return [];

    const argPart = parts[parts.length - 1] || '';
    return argTypeCandidates(argSpec.type)
      .filter(a => a.includes(argPart))
      .map(a => ({ text: a, kind: 'arg' as const, description: '' }));
  }

  function resolveUsage(input: string, cands: Candidate[], selIdx: number): string | null {
    const defs = commandTable;
    const parts = input.split(/\s+/);
    const commandPart = parts[0] || '';
    const exact = defs.find(d => d.name === commandPart);
    if (exact) return buildUsage(exact);
    if (cands.length > 0 && cands[0].kind === 'command') {
      const match = defs.find(d => d.name === cands[selIdx]?.text);
      if (match) return buildUsage(match);
    }
    return null;
  }

  function highlightMatch(text: string, query: string): string {
    if (query === '') return text;
    const q = query.toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return `${before}<span class="highlight">${match}</span>${after}`;
  }

  function getQueryForHighlight(input: string, kind: string): string {
    const parts = input.split(/\s+/);
    if (kind === 'command') return parts[0] || '';
    return parts[parts.length - 1] || '';
  }

  $: candidates = getCandidates(inputValue);
  $: currentUsage = resolveUsage(inputValue, candidates, selectedIndex);

  $: {
    if (selectedIndex >= candidates.length) {
      selectedIndex = Math.max(0, candidates.length - 1);
    }
  }

  function executeCommand() {
    const trimmed = inputValue.trim();
    const spaceIdx = trimmed.indexOf(' ');
    const commandName = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
    const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1);
    const def = commandTable.find(d => d.name === commandName);
    if (def) {
      // FreeText引数がある場合は残り全体を1引数として渡す
      const hasFreeText = def.args.some(a => a.type.tag === 'FreeText');
      const args = hasFreeText ? [stripQuotes(rest)] : rest.split(/\s+/).filter(s => s);
      def.action(args);
    }
    close();
  }

  function stripQuotes(s: string): string {
    const t = s.trim();
    if (t.length >= 2) {
      const first = t[0];
      const last = t[t.length - 1];
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        return t.slice(1, -1);
      }
    }
    return t;
  }

  function longestCommonPrefix(strings: string[]): string {
    if (strings.length === 0) return '';
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
      while (!strings[i].startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
        if (prefix === '') return '';
      }
    }
    return prefix;
  }

  function completeSelected() {
    if (candidates.length === 0) return;

    const texts = candidates.map(c => c.text);
    const lcp = longestCommonPrefix(texts);

    if (candidates.length === 1) {
      // 候補が1つなら確定してスペース
      const c = candidates[0];
      if (c.kind === 'command') {
        inputValue = c.text + ' ';
      } else {
        const parts = inputValue.split(/\s+/);
        parts[parts.length - 1] = c.text;
        inputValue = parts.join(' ') + ' ';
      }
      selectedIndex = 0;
    } else if (candidates[0].kind === 'command') {
      inputValue = lcp;
    } else {
      const parts = inputValue.split(/\s+/);
      parts[parts.length - 1] = lcp;
      inputValue = parts.join(' ');
    }
  }

  function close() {
    inputValue = '';
    selectedIndex = 0;
    commandLineVisible.set(false);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (candidates.length > 0 && candidates[0].kind === 'command' && !inputValue.includes(' ')) {
        completeSelected();
      } else {
        executeCommand();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      completeSelected();
    } else if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, candidates.length - 1);
    } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'u' && e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      const pos = inputElement.selectionStart ?? inputValue.length;
      inputValue = inputValue.slice(pos);
      tick().then(() => { inputElement.selectionStart = inputElement.selectionEnd = 0; });
    }
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if (e.key === '/' && !$commandLineVisible) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      commandLineVisible.set(true);
    }
  }

  function scrollSelectedIntoView(index: number) {
    const list = document.querySelector('.command-list');
    const item = list?.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }

  $: if ($commandLineVisible) {
    tick().then(() => {
      inputElement?.focus();
    });
  }

  $: scrollSelectedIntoView(selectedIndex);

  onMount(() => {
    window.addEventListener('keydown', handleGlobalKeydown, true);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleGlobalKeydown, true);
  });
</script>

{#if $commandLineVisible}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="command-line-overlay" on:click={close}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="command-line-container" on:click|stopPropagation>
      {#if candidates.length > 0}
        <div class="command-list">
          {#each candidates as c, i}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
              class="command-item"
              class:selected={i === selectedIndex}
              on:click={() => { selectedIndex = i; completeSelected(); }}
            >
              <span class="command-name">{@html highlightMatch(c.text, getQueryForHighlight(inputValue, c.kind))}</span>
              {#if c.description}
                <span class="command-desc">{c.description}</span>
              {/if}
              <span class="command-kind">{c.kind === 'command' ? 'cmd' : 'arg'}</span>
            </div>
          {/each}
        </div>
      {:else if inputValue.length > 0}
        <div class="no-match">一致する候補がありません</div>
      {/if}
      {#if currentUsage}
        <div class="command-usage">{currentUsage}</div>
      {/if}
      <div class="command-input-row">
        <span class="prompt">&gt;</span>
        <input
          bind:this={inputElement}
          bind:value={inputValue}
          on:keydown={handleKeydown}
          placeholder="コマンドを入力..."
          spellcheck="false"
        />
      </div>
      <div class="command-legend">
        <span>Tab 補完</span>
        <span>↑↓ 選択</span>
        <span>Enter 実行</span>
        <span>Esc 閉じる</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .command-line-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1100;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 32px;
    background: rgba(0, 0, 0, 0.3);
  }

  .command-line-container {
    width: min(600px, 90vw);
    background: #1e1e2e;
    border: 1px solid #444;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .command-input-row {
    display: flex;
    align-items: center;
    padding: 10px 12px;
  }

  .prompt {
    color: #7aa2f7;
    font-family: monospace;
    font-size: 16px;
    margin-right: 8px;
    user-select: none;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #cdd6f4;
    font-family: monospace;
    font-size: 16px;
  }

  input::placeholder {
    color: #585b70;
  }

  .command-list {
    max-height: 300px;
    overflow-y: auto;
    border-bottom: 1px solid #333;
  }

  .command-item {
    padding: 6px 12px;
    cursor: pointer;
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .command-item.selected {
    background: #313244;
  }

  .command-name {
    color: #cdd6f4;
    font-family: monospace;
    font-size: 14px;
    white-space: nowrap;
  }

  .command-desc {
    color: #6c7086;
    font-family: monospace;
    font-size: 12px;
    flex: 1;
  }

  .command-kind {
    color: #585b70;
    font-family: monospace;
    font-size: 11px;
    margin-left: auto;
  }

  .command-name :global(.highlight),
  .command-desc :global(.highlight) {
    color: #f9e2af;
    font-weight: bold;
  }

  .command-usage {
    padding: 4px 12px;
    color: #a6adc8;
    font-family: monospace;
    font-size: 12px;
    border-bottom: 1px solid #333;
    background: #181825;
  }

  .command-legend {
    display: flex;
    gap: 16px;
    padding: 4px 12px;
    border-top: 1px solid #333;
    color: #585b70;
    font-family: monospace;
    font-size: 11px;
    user-select: none;
  }

  .no-match {
    padding: 8px 12px;
    color: #585b70;
    font-family: monospace;
    font-size: 13px;
    border-bottom: 1px solid #333;
  }
</style>
