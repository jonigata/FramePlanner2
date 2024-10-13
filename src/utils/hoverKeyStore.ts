export function hoverKey(node: HTMLElement, onKeyDown: (event: KeyboardEvent) => void) {
  const handleMouseEnter = (event: MouseEvent) => {
    document.addEventListener("keydown", onKeyDown);
  }
  const handleMouseLeave = (event: MouseEvent) => {
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