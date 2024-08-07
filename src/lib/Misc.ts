export function arrayVectorToObjectVector(v) {
    return {x:v[0], y:v[1]};
}

export function objectVectorToArrayVector(v) {
    return [v.x, v.y];
}

export function documentCoordToElementCoord(e, p) {
    let rect = e.getBoundingClientRect();
    return {x: p.x - rect.left, y:p.y - rect.top};
}

export function elementCoordToDocumentCoord(e, p) {
    let rect = e.getBoundingClientRect();
    return {x: p.x + rect.left, y:p.y + rect.top};
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export function deepCopyProperties(target, source) {
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
