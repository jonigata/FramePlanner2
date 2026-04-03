<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { commandLineVisible } from './commandLineStore';
  import { commandTable, buildUsage, argTypeCandidates } from './commandDefinitions';
  import { rosterNamesCache } from '../notebook/rosterStore';
  import { mainBook } from '../bookeditor/workspaceStore';

  let inputElement: HTMLInputElement;
  let inputValue = '';
  let userQuery = '';  // フィルタリング用のユーザー入力
  let cursorPos = 0;   // カーソル位置
  let selectedIndex = 0;
  let selectionApplied = false;

  interface Candidate {
    text: string;
    kind: 'command' | 'arg';
    description: string;
  }

  // 入力途中のtokenize（閉じていない引用符も最後のトークンとして返す）
  function tokenizePartial(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let quote: string | null = null;

    for (const ch of input) {
      if (quote) {
        if (ch === quote) {
          quote = null;
        } else {
          current += ch;
        }
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ' ' || ch === '\t') {
        tokens.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    tokens.push(current); // 最後のトークン（入力中の部分）
    return tokens;
  }

  function getCandidates(input: string, cursor: number): Candidate[] {
    const defs = commandTable;
    const upToCursor = input.slice(0, cursor);
    const tokens = tokenizePartial(upToCursor);
    const commandPart = tokens[0] || '';

    if (tokens.length <= 1) {
      return defs
        .filter(d => d.name.includes(commandPart))
        .map(d => ({ text: d.name, kind: 'command' as const, description: d.description }));
    }

    const matchedDef = defs.find(d => d.name === commandPart);
    if (!matchedDef) return [];

    const argIndex = tokens.length - 2;
    const argSpec = matchedDef.args[argIndex];
    if (!argSpec) return [];

    const argPart = tokens[tokens.length - 1];
    return argTypeCandidates(argSpec.type)
      .filter(a => a.includes(argPart))
      .map(a => ({ text: a, kind: 'arg' as const, description: '' }));
  }

  function resolveUsage(input: string, cands: Candidate[], selIdx: number): string | null {
    const defs = commandTable;
    const tokens = tokenizePartial(input);
    const commandPart = tokens[0] || '';
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

  function getQueryForHighlight(kind: string): string {
    const parts = userQuery.split(/\s+/);
    if (kind === 'command') return parts[0] || '';
    return parts[parts.length - 1] || '';
  }

  // 候補はuserQuery+カーソル位置ベースでフィルタリング
  $: candidates = (void $rosterNamesCache, void $mainBook, getCandidates(userQuery, cursorPos));
  $: currentUsage = resolveUsage(inputValue, candidates, selectedIndex);

  $: {
    if (selectedIndex >= candidates.length) {
      selectedIndex = Math.max(0, candidates.length - 1);
    }
  }

  // コマンドラインに挿入する際、スペースを含む値は引用符で囲む
  function shellEscape(s: string): string {
    return s.includes(' ') ? `"${s}"` : s;
  }

  // カーソル位置までの文字列から最後のトークン開始位置を求め、そこを差し替える
  function replaceLastToken(upToCursor: string, replacement: string): string {
    // 末尾から遡って最後のトークンの開始位置を見つける
    let i = upToCursor.length - 1;
    let inQuote: string | null = null;
    // 末尾の引用符を検出
    if (i >= 0 && (upToCursor[i] === '"' || upToCursor[i] === "'")) {
      inQuote = upToCursor[i];
      i--;
      while (i >= 0 && upToCursor[i] !== inQuote) i--;
      if (i > 0) i--; // 開き引用符の前
    } else {
      while (i >= 0 && upToCursor[i] !== ' ' && upToCursor[i] !== '\t') i--;
    }
    const prefix = upToCursor.slice(0, i + 1);
    // prefixの末尾がスペースでなければスペースを挟む
    if (prefix && !prefix.endsWith(' ') && !prefix.endsWith('\t')) {
      return prefix + ' ' + replacement;
    }
    return prefix + replacement;
  }

  // ↑↓で候補選択したとき、inputValueに反映
  function applySelection(index: number) {
    if (candidates.length === 0) return;
    const c = candidates[index];
    if (c.kind === 'command') {
      inputValue = c.text;
    } else {
      const upToCursor = userQuery.slice(0, cursorPos);
      inputValue = replaceLastToken(upToCursor, shellEscape(c.text));
    }
  }

  function handleInput() {
    // ユーザーがキーボードで入力した場合、userQueryを同期
    userQuery = inputValue;
    cursorPos = inputElement?.selectionStart ?? inputValue.length;
    selectedIndex = 0;
    selectionApplied = false;
  }

  function handleCursorMove() {
    const newPos = inputElement?.selectionStart ?? inputValue.length;
    if (newPos !== cursorPos) {
      cursorPos = newPos;
      userQuery = inputValue;
      selectedIndex = 0;
      selectionApplied = false;
    }
  }

  // シェルライクな字句解析: 引用符内のスペースを保持し、引用符を除去
  function tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let quote: string | null = null;

    for (const ch of input) {
      if (quote) {
        if (ch === quote) {
          quote = null;
        } else {
          current += ch;
        }
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ' ' || ch === '\t') {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += ch;
      }
    }
    if (current) tokens.push(current);
    return tokens;
  }

  function executeCommand() {
    const tokens = tokenize(inputValue.trim());
    if (tokens.length === 0) { close(); return; }

    const commandName = tokens[0];
    const def = commandTable.find(d => d.name === commandName);
    if (def) {
      const hasFreeText = def.args.some(a => a.type.tag === 'FreeText');
      const args = hasFreeText ? [tokens.slice(1).join(' ')] : tokens.slice(1);
      def.action(args);
    }
    close();
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

  function confirmCandidate(c: Candidate) {
    if (c.kind === 'command') {
      inputValue = c.text + ' ';
    } else {
      const upToCursor = userQuery.slice(0, cursorPos);
      inputValue = replaceLastToken(upToCursor, shellEscape(c.text)) + ' ';
    }
    userQuery = inputValue;
    cursorPos = inputValue.length;
    selectedIndex = 0;
    selectionApplied = false;
  }

  function completeSelected() {
    if (candidates.length === 0) return;

    // 選択済み or 候補1つ → その候補で確定
    if (selectionApplied || candidates.length === 1) {
      confirmCandidate(candidates[selectionApplied ? selectedIndex : 0]);
      return;
    }

    // 複数候補: LCPまで進める
    const texts = candidates.map(c => c.text);
    const lcp = longestCommonPrefix(texts);
    if (candidates[0].kind === 'command') {
      inputValue = lcp;
    } else {
      const upToCursor = userQuery.slice(0, cursorPos);
      inputValue = replaceLastToken(upToCursor, lcp);
    }
    userQuery = inputValue;
    cursorPos = inputValue.length;
  }

  function close() {
    inputValue = '';
    userQuery = '';
    cursorPos = 0;
    selectedIndex = 0;
    selectionApplied = false;
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
        confirmCandidate(candidates[selectedIndex]);
      } else {
        executeCommand();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      completeSelected();
    } else if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
      e.preventDefault();
      if (!selectionApplied) {
        selectedIndex = 0;
        selectionApplied = true;
        applySelection(selectedIndex);
      } else if (selectedIndex < candidates.length - 1) {
        selectedIndex++;
        applySelection(selectedIndex);
      } else {
        // 下端を超えたら無選択に戻す
        selectionApplied = false;
        inputValue = userQuery;
      }
    } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
      e.preventDefault();
      if (!selectionApplied) {
        selectedIndex = candidates.length - 1;
        selectionApplied = true;
        applySelection(selectedIndex);
      } else if (selectedIndex > 0) {
        selectedIndex--;
        applySelection(selectedIndex);
      } else {
        // 上端を超えたら無選択に戻す
        selectionApplied = false;
        inputValue = userQuery;
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // カーソル移動はデフォルト動作に任せ、次tickでカーソル位置を反映
      tick().then(handleCursorMove);
      return;
    } else if (e.key === 'u' && e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      const pos = inputElement.selectionStart ?? inputValue.length;
      inputValue = inputValue.slice(pos);
      userQuery = inputValue;
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
              class:selected={selectionApplied && i === selectedIndex}
              on:click={() => { confirmCandidate(c); }}
            >
              <span class="command-name">{@html highlightMatch(c.text, getQueryForHighlight(c.kind))}</span>
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
          on:input={handleInput}
          on:keydown={handleKeydown}
          on:click={handleCursorMove}
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
