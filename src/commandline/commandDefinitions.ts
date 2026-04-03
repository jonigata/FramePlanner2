import { get } from 'svelte/store';
import { bookOperators, mainBook } from '../bookeditor/workspaceStore';
import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
import type { BookWorkspaceOperators } from '../bookeditor/BookWorkspaceOperators';

// ── 引数型(ADT) ──────────────────────────────────

export type ArgType =
  | { tag: 'PageTemplateName' }
  ;

export function argTypeCandidates(t: ArgType): string[] {
  switch (t.tag) {
    case 'PageTemplateName':
      return Object.keys(frameExamples);
  }
}

export function argTypeLabel(t: ArgType): string {
  switch (t.tag) {
    case 'PageTemplateName':
      return 'template-name';
  }
}

// ── 引数スペック ──────────────────────────────────

export interface ArgSpec {
  type: ArgType;
  required: boolean;
}

// ── コマンド定義 ──────────────────────────────────

export interface CommandDef {
  name: string;
  description: string;
  args: ArgSpec[];
  action: (args: string[]) => void;
}

export function buildUsage(def: CommandDef): string {
  const argParts = def.args.map(a => {
    const label = argTypeLabel(a.type);
    return a.required ? `<${label}>` : `[${label}]`;
  });
  return [def.name, ...argParts].join(' ');
}

// ── アクション ───────────────────────────────────

function newPage(args: string[]): void {
  const ops = get(bookOperators) as BookWorkspaceOperators | null;
  const book = get(mainBook);
  if (!ops || !book) return;

  const focusedPage = ops.getFocusedPage();
  const index = book.pages.indexOf(focusedPage);
  const templateName = args[0]?.trim();
  if (templateName && templateName in frameExamples) {
    ops.insertPageWithTemplate(index + 1, templateName);
  } else {
    ops.insertPage(index + 1);
  }
}

// ── コマンドテーブル ─────────────────────────────

export const commandTable: CommandDef[] = [
  {
    name: 'new-page',
    description: '新しいページを追加',
    args: [{ type: { tag: 'PageTemplateName' }, required: false }],
    action: newPage,
  },
];
