import { type Writable, writable } from "svelte/store";

export const toolTipRequest: Writable<{message: string, rect: {left: number, top: number, width: number, height: number}}> = writable(null);

export function toolTip(node, message) {
  let timeoutId = null;
  let observer = null;

  const handleMouseEnter = (event) => {
    const topElement = document.elementFromPoint(event.clientX, event.clientY);
    if (topElement !== node && !node.contains(topElement)) {
      console.log("toolTip: blocked by other element");
      return;
    }
    timeoutId = setTimeout(() => {
      const rect = node.getBoundingClientRect();
      toolTipRequest.set({ message, rect });
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
