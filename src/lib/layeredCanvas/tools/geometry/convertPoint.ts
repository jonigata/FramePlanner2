function getTransformationMatrix(element) {
  let transformationMatrix = new DOMMatrix();
  let x = element;

  while (x && x !== document.documentElement) {
    const transform = window.getComputedStyle(x, undefined).transform;
    transformationMatrix = new DOMMatrix(transform).multiply(transformationMatrix);
    x = x.parentNode;
  }

  const rect = element.getBoundingClientRect();
  transformationMatrix = new DOMMatrix()
    .translate(rect.left + window.scrollX, rect.top + window.scrollY)
    .multiply(transformationMatrix);

  return transformationMatrix;
}

export function convertPointFromPageToNode(element, pageX, pageY) {
  const point = new DOMPoint(pageX, pageY);
  return point.matrixTransform(getTransformationMatrix(element).inverse());
};

export function convertPointFromNodeToPage(element, offsetX, offsetY) {
  const point = new DOMPoint(offsetX, offsetY);
  return point.matrixTransform(getTransformationMatrix(element));
};
