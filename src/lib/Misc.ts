export function arrayVectorToObjectVector(v: [number, number]) {
    return {x:v[0], y:v[1]};
}

export function objectVectorToArrayVector(v: {x: number, y: number}) {
    return [v.x, v.y];
}

export function documentCoordToElementCoord(e: HTMLElement, p: {x: number, y: number}) {
    let rect = e.getBoundingClientRect();
    return {x: p.x - rect.left, y:p.y - rect.top};
}

export function elementCoordToDocumentCoord(e: HTMLElement, p: {x: number, y: number}) {
    let rect = e.getBoundingClientRect();
    return {x: p.x + rect.left, y:p.y + rect.top};
}

function isObject(item: any) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export function deepCopyProperties(target: any, source: any) {
  Object.keys(source).forEach(key => {
    if (isObject(source[key])) {
      if (!target[key]) target[key] = {};
      deepCopyProperties(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  });
  return target;
}
