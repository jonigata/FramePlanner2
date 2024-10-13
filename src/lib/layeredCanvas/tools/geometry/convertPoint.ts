function getTransformationMatrix(element: HTMLElement) {
  let transformationMatrix = new DOMMatrix();
  let x = element;

  while (x && x !== document.documentElement) {
    const transform = window.getComputedStyle(x).transform;
    transformationMatrix = new DOMMatrix(transform).multiply(transformationMatrix);
    x = x.parentElement!;
  }

  const rect = element.getBoundingClientRect();
  transformationMatrix = new DOMMatrix()
    .translate(rect.left + window.scrollX, rect.top + window.scrollY)
    .multiply(transformationMatrix);

  return transformationMatrix;
}

export function convertPointFromPageToNode(element: HTMLElement, pageX: number, pageY: number) {
  const point = new DOMPoint(pageX, pageY);
  return point.matrixTransform(getTransformationMatrix(element).inverse());
};

export function convertPointFromNodeToPage(element: HTMLElement, offsetX: number, offsetY: number) {
  const point = new DOMPoint(offsetX, offsetY);
  return point.matrixTransform(getTransformationMatrix(element));
};
