import type { CSSProperties } from "react";
import type { Treasury } from "./palace-products";

/** Coordinates are measured in the COMPLETE, unmodified uploaded images.
 * Never crop these canvases: every clickable frame uses the same coordinate system. */
export const SCENES = {
  desktop: { width: 1584, height: 993, src: "/images/palace/royal-scene-v2/desktop.jpg", plate: "/images/palace/royal-scene-v2/desktop-open.webp" },
  mobile: { width: 850, height: 1850, src: "/images/palace/royal-scene-v2/mobile.jpg", plate: "/images/palace/royal-scene-v2/mobile-open.webp" },
} as const;
export type SceneMode = keyof typeof SCENES;
export const MOBILE_SCENE_QUERY = "(max-width: 767px)";
export type Rect = readonly [x: number, y: number, width: number, height: number];
export type ResponsiveRect = { desktop: Rect; mobile: Rect };

export const CHEST_FRAMES: Record<Treasury, ResponsiveRect> = {
  gold: { desktop: [171, 107, 325, 207], mobile: [488, 91, 302, 194] },
  silver: { desktop: [618, 108, 316, 206], mobile: [486, 400, 305, 206] },
  weave: { desktop: [1081, 107, 316, 208], mobile: [482, 669, 308, 239] },
};
export const ENTRY_FRAMES: Record<Treasury, ResponsiveRect> = {
  gold: { desktop: [162, 441, 351, 48], mobile: [91, 232, 308, 53] },
  silver: { desktop: [613, 441, 352, 48], mobile: [91, 548, 308, 53] },
  weave: { desktop: [1070, 441, 351, 48], mobile: [91, 864, 308, 54] },
};
export const PREVIEW_FRAMES: Record<Treasury, ResponsiveRect[]> = {
  gold: [
    { desktop: [159, 331, 113, 109], mobile: [40, 100, 132, 122] },
    { desktop: [281, 331, 113, 109], mobile: [178, 100, 132, 122] },
    { desktop: [403, 331, 113, 109], mobile: [317, 100, 132, 122] },
  ],
  silver: [
    { desktop: [613, 331, 113, 109], mobile: [40, 414, 132, 123] },
    { desktop: [734, 331, 113, 109], mobile: [178, 414, 132, 123] },
    { desktop: [855, 331, 113, 109], mobile: [317, 414, 132, 123] },
  ],
  weave: [
    { desktop: [1068, 331, 113, 109], mobile: [40, 729, 132, 124] },
    { desktop: [1190, 331, 113, 109], mobile: [178, 729, 132, 124] },
    { desktop: [1311, 331, 113, 109], mobile: [317, 729, 132, 124] },
  ],
};
export const FEATURED_FRAMES: ResponsiveRect[] = [
  { desktop: [184, 579, 407, 111], mobile: [78, 1066, 337, 140] },
  { desktop: [600, 579, 384, 111], mobile: [435, 1066, 338, 140] },
  { desktop: [992, 579, 408, 111], mobile: [78, 1213, 337, 136] },
  { desktop: [184, 694, 407, 120], mobile: [435, 1213, 338, 136] },
  { desktop: [600, 694, 384, 120], mobile: [78, 1353, 337, 139] },
  { desktop: [992, 694, 408, 120], mobile: [435, 1353, 338, 139] },
  { desktop: [184, 818, 407, 129], mobile: [78, 1496, 337, 145] },
  { desktop: [600, 818, 384, 129], mobile: [435, 1496, 338, 145] },
  { desktop: [992, 818, 408, 129], mobile: [238, 1645, 372, 142] },
];

export function frameStyle(frame: ResponsiveRect): CSSProperties {
  const style: Record<string, string> = {};
  for (const mode of ["desktop", "mobile"] as const) {
    const [x, y, width, height] = frame[mode], scene = SCENES[mode];
    for (const [name, value, dimension] of [["x", x, scene.width], ["y", y, scene.height], ["w", width, scene.width], ["h", height, scene.height]] as const) {
      style[`--ep-${mode}-${name}`] = `${value / dimension * 100}%`;
    }
  }
  return style as CSSProperties;
}
