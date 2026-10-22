/** Largest undistorted rectangle fully inscribed in a circle (with a 1% inset). */
export function circularPhotoSize(width: number, height: number): number {
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) return 70;
  return Math.min(99, 99 * Math.max(width, height) / Math.hypot(width, height));
}
