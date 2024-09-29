import { type Writable, writable } from "svelte/store";

export const toolTipRequest: Writable<
  {
    message: string, 
    rect: {left: number, top: number, width: number, height: number},
    cost?: number
  }> = writable(null);

export function toolTip(node: HTMLElement, message: string) {
  let timeoutId = null;
  let observer = null;

  // messageに[cost]が含まれている場合、costを取り出す
  const match = message.match(/\[(\d+)\]/);
  let cost = match ? parseInt(match[1]) : undefined;
  if (cost === 0) {
    cost = undefined;
  }
  if (match) {
    message = message.replace(match[0], "");
  }

  const handleMouseEnter = (event) => {
    const topElement = document.elementFromPoint(event.clientX, event.clientY);
    if (topElement !== node && !node.contains(topElement)) {
      console.log("toolTip: blocked by other element");
      return;
    }
    timeoutId = setTimeout(() => {
      const rect = node.getBoundingClientRect();
      toolTipRequest.set({ message, rect, cost });
    }, 400);
  }

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    toolTipRequest.set(null);
  }

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    toolTipRequest.set(null);
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // MutationObserverを設定
  observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      if (mutation.type === 'childList') {
        const removedNodes = Array.from(mutation.removedNodes);
        if (removedNodes.includes(node) || removedNodes.some(removed => removed.contains(node))) {
          cleanup();
          return;
        }
      }
    }
  });

  // documentまたはnodeの親要素を監視
  const target = node.parentElement || document.body;
  observer.observe(target, { childList: true, subtree: true });

  node.addEventListener("mouseenter", handleMouseEnter);
  node.addEventListener("mouseleave", handleMouseLeave);

  return {
    update(newMessage) {
      message = newMessage;
    },
    destroy() {
      node.removeEventListener("mouseenter", handleMouseEnter);
      node.removeEventListener("mouseleave", handleMouseLeave);
      cleanup();
    }
  };
}
