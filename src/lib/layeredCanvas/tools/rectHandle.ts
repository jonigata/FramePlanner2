export type RectCornerHandle = 
  "topLeft"|
  "topRight"|
  "bottomLeft"|
  "bottomRight";

export type RectSideHandle =
  "top"|
  "bottom"|
  "left"|
  "right";

export type RectHandle = RectCornerHandle | RectSideHandle;

export const rectCornerHandles: RectCornerHandle[] = [
  "topLeft",
  "topRight",
  "bottomLeft",
  "bottomRight"
];

export const rectSideHandles: RectSideHandle[] = [
  "top",
  "bottom",
  "left",
  "right"
];

export const rectHandles: RectHandle[] = [
  ...rectCornerHandles,
  ...rectSideHandles
];
