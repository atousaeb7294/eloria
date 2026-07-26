import type { SVGProps } from "react";

export type LuxuryIconProps =
  SVGProps<SVGSVGElement>;

export function HomeRuneIcon({
  className,
  ...props
}: LuxuryIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M10 30L32 10L54 30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M16 27V53H48V27"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="M25 53V39C25 34.6 28.1 31 32 31C35.9 31 39 34.6 39 39V53"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M32 16L34.5 22.5L41 25L34.5 27.5L32 34L29.5 27.5L23 25L29.5 22.5L32 16Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function WorldRuneIcon({
  className,
  ...props
}: LuxuryIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle
        cx="32"
        cy="32"
        r="21"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <circle
        cx="32"
        cy="32"
        r="14"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity="0.65"
      />

      <path
        d="M32 6L35.8 25L58 32L35.8 39L32 58L28.2 39L6 32L28.2 25L32 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <circle
        cx="32"
        cy="32"
        r="5"
        fill="currentColor"
      />
    </svg>
  );
}

export function ContactRuneIcon({
  className,
  ...props
}: LuxuryIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M11 18H53V46H36L25 55V46H11V18Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />

      <path
        d="M16 23L32 36L48 23"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M32 10L34.2 15.8L40 18L34.2 20.2L32 26L29.8 20.2L24 18L29.8 15.8L32 10Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function NecklaceRuneIcon({
  className,
  ...props
}: LuxuryIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M9 10C11.5 30.5 19 42.5 32 48C45 42.5 52.5 30.5 55 10"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />

      <path
        d="M32 42L41 51L32 62L23 51L32 42Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M28 51H36"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      <circle
        cx="9"
        cy="9"
        r="2.6"
        fill="currentColor"
      />

      <circle
        cx="55"
        cy="9"
        r="2.6"
        fill="currentColor"
      />
    </svg>
  );
}

export function BraceletRuneIcon({
  className,
  ...props
}: LuxuryIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <ellipse
        cx="32"
        cy="36"
        rx="24"
        ry="17"
        stroke="currentColor"
        strokeWidth="1.9"
      />

      <ellipse
        cx="32"
        cy="36"
        rx="16.5"
        ry="10.5"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.6"
      />

      <path
        d="M32 7L40 18L32 29L24 18L32 7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M13 27L20 31"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <path
        d="M51 27L44 31"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EarringRuneIcon({
  className,
  ...props
}: LuxuryIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle
        cx="20"
        cy="11"
        r="5"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <circle
        cx="44"
        cy="11"
        r="5"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M20 16V30"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="M44 16V30"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="M20 28L30 43L20 59L10 43L20 28Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M44 28L54 43L44 59L34 43L44 28Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M16 43H24"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      <path
        d="M40 43H48"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MagicArrowIcon({
  className,
  ...props
}: LuxuryIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M11 34H49"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M39 23L51 34L39 45"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M22 12L24.5 18.5L31 21L24.5 23.5L22 30L19.5 23.5L13 21L19.5 18.5L22 12Z"
        fill="currentColor"
      />
    </svg>
  );
}