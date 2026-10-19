import type { Treasury } from "./palace-products";
import type { SceneMode } from "./palace-scene";

export type Point = readonly [number, number];
export type Lid = { outline: Point[]; latch: Point[]; anchor: Point; rear: Point; slope: number; front: number; top: number; shear: number };
// Original-image coordinates, including the latch, not an arbitrary rectangular crop.
export const LIDS: Record<SceneMode, Record<Treasury, Lid>> = {
  desktop: {
    gold: { outline: [[178,201],[181,168],[188,139],[198,120],[211,112],[445,113],[460,116],[475,133],[484,161],[489,201]], latch: [[354,195],[373,195],[378,210],[387,226],[380,242],[367,255],[353,242],[347,225],[352,210]], anchor:[365,200], rear:[333,174], slope:0, front:202, top:112, shear:-.10 },
    silver: { outline: [[622,201],[625,167],[634,139],[644,120],[656,113],[885,114],[902,122],[916,142],[925,170],[929,201]], latch:[[779,195],[796,195],[801,211],[810,226],[802,241],[790,253],[777,241],[771,225],[777,210]], anchor:[790,201], rear:[775,175], slope:0, front:202, top:113, shear:-.06 },
    weave: { outline: [[1087,202],[1090,168],[1098,142],[1111,122],[1126,114],[1344,114],[1360,122],[1374,145],[1384,172],[1389,201]], latch:[[1227,196],[1245,196],[1250,211],[1259,226],[1251,241],[1239,252],[1226,239],[1220,224],[1225,210]], anchor:[1239,201], rear:[1238,175], slope:0, front:202, top:114, shear:-.04 },
  },
  mobile: {
    gold: { outline:[[497,177],[500,146],[510,121],[528,105],[550,99],[718,96],[745,100],[762,113],[775,140],[782,178],[556,191]], latch:[[663,179],[679,178],[683,190],[691,202],[683,216],[673,232],[659,219],[653,205],[659,190]], anchor:[672,182], rear:[632,149], slope:-.03, front:185, top:97, shear:.32 },
    silver: { outline:[[490,490],[494,457],[505,430],[523,416],[709,409],[741,413],[760,429],[774,455],[783,490],[550,507]], latch:[[650,489],[678,488],[684,504],[692,525],[682,548],[665,567],[646,550],[637,527],[644,505]], anchor:[663,496], rear:[632,456], slope:-.035, front:500, top:410, shear:.30 },
    weave: { outline:[[488,770],[492,735],[504,704],[523,686],[710,675],[737,678],[760,697],[773,731],[784,769],[548,789]], latch:[[649,773],[669,772],[674,789],[682,806],[672,825],[659,842],[645,828],[639,811],[644,794]], anchor:[660,779], rear:[632,738], slope:-.03, front:780, top:677, shear:.32 },
  },
};

const ELEVATION = 0.35;
export const MAX_LID_ANGLE = Math.PI * 0.52;
export function hingeDepth(lid: Lid) { return (lid.front - lid.rear[1]) / Math.sin(ELEVATION); }

/** The rear hinge is invariant. All lid vertices undergo the SAME rigid X rotation;
 * photograph perspective is calibrated separately, so no flying/sliding lid. */
export function projectWorld(lid: Lid, x: number, height: number, depth: number, angle: number): Point {
  const rise = height * Math.cos(angle) + depth * Math.sin(angle);
  const retreat = depth * Math.cos(angle) - height * Math.sin(angle);
  return [x + (retreat - depth) * lid.shear,
    lid.rear[1] + (x - lid.rear[0]) * lid.slope + retreat * Math.sin(ELEVATION) - rise * Math.cos(ELEVATION)];
}
export function lidVertex(lid: Lid, point: Point, angle: number): Point {
  const [x, y] = point, hingeY = lid.rear[1] + (x - lid.rear[0]) * lid.slope;
  const t = Math.max(0, Math.min(1, (y - lid.top) / (lid.front - lid.top)));
  // A curved barrel shell, rather than the planar cutout used by the old effect.
  const depth = hingeDepth(lid) * (.48 + .52 * Math.sqrt(t));
  const height = (depth * Math.sin(ELEVATION) - (y - hingeY)) / Math.cos(ELEVATION);
  return projectWorld(lid, x, height, depth, angle);
}
export function openingAngle(elapsed: number): number {
  const t = Math.max(0, Math.min(1, (elapsed - 90) / 600));
  // Gentle acceleration and braking: no overshoot through the hinge stop.
  return MAX_LID_ANGLE * t * t * (3 - 2 * t);
}
