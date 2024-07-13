import { type Writable, writable } from "svelte/store";

export const toolTipRequest: Writable<{message: string, rect: {left: number, top: number, width: number, height: number}}> = writable(null);

export function toolTip(node, message) {
  let timeoutId = null;

  const handleMouseEnter = (event) => {
    // 何かが阻害しているとき、それが自分自身の子孫でないなら何もしない
    const topElement = document.elementFromPoint(event.clientX, event.clientY);
    if (topElement !== node && !node.contains(topElement)) {
      console.log("toolTip: blocked by other element");
      return;
    }

    timeoutId = setTimeout(() => {
      const rect = node.getBoundingClientRect();
      toolTipRequest.set({ message, rect});
    }, 1000);
  }
  const handleMouseLeave = (event) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    toolTipRequest.set(null);
  }
  
  node.addEventListener("mouseenter", handleMouseEnter);
  node.addEventListener("mouseleave", handleMouseLeave);

  return {
    destroy() {
      node.removeEventListener("mouseenter", handleMouseEnter);
      node.removeEventListener("mouseleave", handleMouseLeave);
    }
  };
}
