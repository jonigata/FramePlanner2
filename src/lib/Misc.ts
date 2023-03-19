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


