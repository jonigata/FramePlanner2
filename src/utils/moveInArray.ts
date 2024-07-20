export function moveInArray<T>(a: T[], oldIndex: number, newIndex: number) {
  // console.log("moveInArray", (a as any).map(e => e.index), oldIndex, newIndex);
  a.splice(newIndex, 0, a.splice(oldIndex, 1)[0]);
}
