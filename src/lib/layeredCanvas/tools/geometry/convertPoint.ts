/*jslint plusplus: true, vars: true, indent: 2 */

/*
  convertPointFromPageToNode(element, event.pageX, event.pageY) -> {x, y}
  returns coordinate in element's local coordinate system (works properly with css transforms without perspective projection)

  convertPointFromNodeToPage(element, offsetX, offsetY) -> {x, y}
  returns coordinate in window's coordinate system (works properly with css transforms without perspective projection)
*/

var I = new WebKitCSSMatrix();

class Point  {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  transformBy(matrix: WebKitCSSMatrix): Point {
    var tmp = matrix.multiply(I.translate(this.x, this.y, this.z));
    return new Point(tmp.m41, tmp.m42, tmp.m43);
  }
};

function getTransformationMatrix(element: HTMLElement): WebKitCSSMatrix {
  var transformationMatrix = I;
  var x = element;

  while (x != undefined && x !== x.ownerDocument.documentElement) {
    var computedStyle = window.getComputedStyle(x, undefined);
    var transform = computedStyle.transform || "none";
    var c = transform === "none" ? I : new WebKitCSSMatrix(transform);
    transformationMatrix = c.multiply(transformationMatrix);
    x = x.parentNode as HTMLElement;
  }

  var w = element.offsetWidth;
  var h = element.offsetHeight;
  var p1 = new Point(0, 0, 0).transformBy(transformationMatrix);
  var p2 = new Point(w, 0, 0).transformBy(transformationMatrix);
  var p3 = new Point(w, h, 0).transformBy(transformationMatrix);
  var p4 = new Point(0, h, 0).transformBy(transformationMatrix);
  var left = Math.min(p1.x, p2.x, p3.x, p4.x);
  var top = Math.min(p1.y, p2.y, p3.y, p4.y);

  var rect = element.getBoundingClientRect();
  transformationMatrix = I.translate(
    window.scrollX + rect.left - left,
    window.scrollY + rect.top - top,
    0
  ).multiply(transformationMatrix);

  return transformationMatrix;
}

export function convertPointFromPageToNode(element: HTMLElement, pageX: number, pageY: number): Point {
  return new Point(pageX, pageY, 0).transformBy(
    getTransformationMatrix(element).inverse()
  );
};

export function convertPointFromNodeToPage(element: HTMLElement, offsetX: number, offsetY: number): Point {
  return new Point(offsetX, offsetY, 0).transformBy(
    getTransformationMatrix(element)
  );
};
