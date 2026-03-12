/**
 * Goalactico points scale: exact = 10, ±1 = 7, ±2 = 4, ±3 = 2, else = 0
 */
export function calculatePoints(predicted: number, actual: number): number {
  const diff = Math.abs(predicted - actual);
  if (diff === 0) return 10;
  if (diff === 1) return 7;
  if (diff === 2) return 4;
  if (diff === 3) return 2;
  return 0;
}
