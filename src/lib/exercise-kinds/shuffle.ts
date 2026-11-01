// 0..length-1 in a random order (Fisher–Yates).
export function shuffleIndexes(length: number): number[] {
  const order = Array.from({ length }, (_unused, index) => index);
  for (let currentIndex = order.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    [order[currentIndex], order[randomIndex]] = [order[randomIndex], order[currentIndex]];
  }
  return order;
}

// A shuffle that differs from `avoid` (by default 0..length-1, i.e. already in
// order) whenever there are two or more items.
export function shuffleIndexesUnlike(length: number, avoid?: number[]): number[] {
  const unwanted = avoid ?? Array.from({ length }, (_unused, index) => index);
  let order = shuffleIndexes(length);
  while (length > 1 && order.every((value, index) => value === unwanted[index])) order = shuffleIndexes(length);
  return order;
}
