export type SelectionInfo = {
  selectedText: string;
  node: HTMLTextAreaElement | HTMLInputElement;
  start: number;
  end: number;
  hasSelection: boolean;
};

type SelectionCallback = (info: SelectionInfo) => void;

type SelectionActionReturn = {
  destroy: () => void;
};

export function selection(
  node: HTMLTextAreaElement | HTMLInputElement,
  callback: SelectionCallback
): SelectionActionReturn {
  const handleSelection = () => {
    const start = node.selectionStart;
    const end = node.selectionEnd;
    const hasSelection = start !== end;
    
    const info: SelectionInfo = {
      selectedText: hasSelection ? node.value.substring(start, end) : '',
      node,
      start,
      end,
      hasSelection
    };
    
    callback(info);
  };

  node.addEventListener('selectionchange', handleSelection);

  return {
    destroy() {
      node.removeEventListener('selectionchange', handleSelection);
    }
  };
}