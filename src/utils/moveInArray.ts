export function moveInArray<T>(a: T[], oldIndex: number, newIndex: number) {
  // reversed order
  oldIndex = a.length - 1 - oldIndex;
  newIndex = a.length - 1 - newIndex;
  
  if (oldIndex < newIndex) {
    const film = a.splice(oldIndex, 1)[0];
    a.splice(newIndex, 0, film);
  } else {
    const film = a.splice(oldIndex, 1)[0];
    a.splice(newIndex, 0, film);
  }
}
