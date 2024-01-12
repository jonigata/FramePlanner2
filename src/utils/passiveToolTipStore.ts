import { writable } from "svelte/store";

export const toolTipRequest = writable(null);

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
      const r = node.getBoundingClientRect();
      const [cx, cy] = [r.left + r.width / 2, r.top - r.height / 2];
      toolTipRequest.set({ message, position: {x: cx, y: cy-25 }});
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
