export const computePhase = (
  columnPosition: number,
  totalColumns: number
): 1 | 2 | 3 | 4 => {
  if (totalColumns <= 1) return 1;
  const ratio = columnPosition / (totalColumns - 1);
  return Math.min(
    4,
    Math.max(1, Math.ceil(ratio * 4) || 1)
  ) as 1 | 2 | 3 | 4;
};
