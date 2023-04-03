import * as paper from 'paper';

export function cssColorToRgba(colorString) {
  const color = new paper.Color(colorString);
  return [color.red, color.green, color.blue, color.alpha];
}

export function rgbaToCssColor(c) {
  function f(x) { return Math.floor(x * 255); }
  return `rgba(${f(c[0])}, ${f(c[1])}, ${f(c[2])}, ${c[3]})`    
}
