import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };
const knot = "M12 3C8 7 6 10 6 13a6 6 0 0 0 12 0c0-3-2-6-6-10ZM7 10c5 0 5 8 10 8M17 10c-5 0-5 8-10 8";

/** Small line engravings drawn from Eloria's woven cord and jewel motifs. */
export function EloriaKnotIcon({ size = 24, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={knot} /></svg>;
}
export function EloriaJewelIcon({ size = 24, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
    <path d="m12 3 6 7-6 11-6-11 6-7ZM6 10h12M12 3l-2 7 2 11 2-11-2-7" />
  </svg>;
}
export function EloriaPortalIcon({ size = 24, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
    <path d="M4 21V11c0-4 4-6 8-9 4 3 8 5 8 9v10M8 21V11c0-2 2-4 4-5 2 1 4 3 4 5v10M2 21h20" />
  </svg>;
}
function arrow(rotation: number) {
  return function EloriaArrow({ size = 24, ...props }: IconProps) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <g transform={`rotate(${rotation} 12 12)`}><path d="M4 12h16m-5-5 5 5-5 5M4 8c3 0 5 2 5 4-3 0-5-2-5-4Zm0 8c3 0 5-2 5-4-3 0-5 2-5 4Z" /></g>
    </svg>;
  };
}
export const ArrowRight = arrow(0);
export const ArrowLeft = arrow(180);
export const ArrowUp = arrow(-90);
export const ArrowDown = arrow(90);
export const ArrowUpLeft = arrow(-135);
export const ArrowUpRight = arrow(-45);
export const ArrowDownLeft = arrow(135);
export const ArrowDownRight = arrow(45);
