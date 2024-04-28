export function fitWithin(node: HTMLElement) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        const rect = node.getBoundingClientRect();
        const parentRect = node.parentElement.getBoundingClientRect();

        if (rect.bottom > parentRect.bottom) {
          node.style.top = `${parentRect.bottom - rect.height}px`;
        }
        if (rect.right > parentRect.right) {
          node.style.left = `${parentRect.right - rect.width}px`;
        }
        if (rect.top < parentRect.top) {
          node.style.top = `0px`;
        }
        if (rect.left < parentRect.left) {
          node.style.left = `0px`;
        }
      }
    }
  }, {
    threshold: 1.0
  });

  observer.observe(node);

  return {
    destroy() {
      observer.disconnect();
    }
  };
}
