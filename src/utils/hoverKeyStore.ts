// stores.ts
import { writable } from "svelte/store";

export function hoverKey(node, onKeyDown) {
  let timeoutId = null;

  const handleMouseEnter = (event) => {
    document.addEventListener("keydown", onKeyDown);
  }
  const handleMouseLeave = (event) => {
    document.removeEventListener("keydown", onKeyDown);
  }
  
  node.addEventListener("mouseenter", handleMouseEnter);
  node.addEventListener("mouseleave", handleMouseLeave);

  return {
    destroy() {
      node.removeEventListener("mouseenter", handleMouseEnter);
      node.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("keydown", onKeyDown);
    }
  };
}