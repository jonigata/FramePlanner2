// stores.ts
import { writable } from "svelte/store";

export const toolTipRequest = writable(null);

export function toolTip(node, message) {
  const handleMouseEnter = (event) => {
    setTimeout(() => {
      const r = node.getBoundingClientRect();
      const [cx, cy] = [r.left + r.width / 2, r.top + r.height / 2];
      toolTipRequest.set({ message, position: {x: cx, y: cy-30 }});
    }, 1000);
  }
  const handleMouseLeave = (event) => {
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