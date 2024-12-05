import { createHash } from 'sha1-uint8array'

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

export async function sha1(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = createHash().update(new Uint8Array(data)).digest();
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function blobToSha1(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = createHash().update(new Uint8Array(buffer)).digest();
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
