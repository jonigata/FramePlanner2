import { collectLeaves } from '../../lib/layeredCanvas/dataModels/frameTree';
import type { Page } from '../../lib/book/book';

export async function exportPrompts(pages: Page[]) {
  const prompts = [];
  for (let i = 0; i < pages.length; i++) {
    const leaves = collectLeaves(pages[i].frameTree);
    for (const leaf of leaves) {
      prompts.push(leaf.prompt);
    }
  }
  const blob = new Blob([prompts.join('\n')], {type: 'text/plain'});
  await navigator.clipboard.write([
    new ClipboardItem({[blob.type]: blob}),
  ]);
}
