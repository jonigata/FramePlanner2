export function observeResize(node) {
  const resizeObserver = new ResizeObserver(entries => {
    console.log(entries);
    for (let entry of entries) {
      // ここでリサイズ時の処理を記述
      console.log(entry.target, entry.contentRect.width, entry.contentRect.height);
    }
  });

  resizeObserver.observe(node);

  return {
    destroy() {
      resizeObserver.unobserve(node);
    }
  };
}