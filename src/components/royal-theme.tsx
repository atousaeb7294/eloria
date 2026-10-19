// Royal-purple decorative scenery with lapis veins only. The green mask excludes gold, stone, skin,
// and neutral highlights; catalogue ProductImage elements never use this filter.
// The existing artwork remains the source of every frame and its geometry.
const veins = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1126 584">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g stroke="#243d91" stroke-width="7" opacity=".22">
      <path d="M-25 417C30 401 48 366 90 362S130 382 151 376 208 319 235 313 260 333 278 326 327 270 356 258 391 276 419 270 457 222 486 216 558 240 584 233 617 186 649 181 710 205 735 197 793 140 820 134 887 161 910 153 961 98 989 94 1093 60 1154 41"/>
      <path d="M88-20C95 13 128 42 128 63S102 115 111 139 153 169 160 193 143 233 153 255 195 278 204 293 178 333 185 352 229 390 224 409 205 461 218 486 262 550 270 601M649 181C642 155 613 135 618 113S644 88 641 73 620 28 630-14M735 197C752 221 783 243 780 265S752 299 763 320 806 361 807 383 778 421 786 442 827 490 829 514 800 570 812 599"/>
    </g>
    <g stroke="#7189da" stroke-width=".8" opacity=".30">
      <path d="M-25 417C30 401 48 366 90 362S130 382 151 376 208 319 235 313 260 333 278 326 327 270 356 258 391 276 419 270 457 222 486 216 558 240 584 233 617 186 649 181 710 205 735 197 793 140 820 134 887 161 910 153 961 98 989 94 1093 60 1154 41"/>
      <path d="M88-20C95 13 128 42 128 63S102 115 111 139 153 169 160 193 143 233 153 255 195 278 204 293 178 333 185 352 229 390 224 409 205 461 218 486 262 550 270 601M649 181C642 155 613 135 618 113S644 88 641 73 620 28 630-14M735 197C752 221 783 243 780 265S752 299 763 320 806 361 807 383 778 421 786 442 827 490 829 514 800 570 812 599"/>
    </g>
  </g>
</svg>`)}`;

export function RoyalThemeDefinitions() {
  return (
    <svg
      className="eloria-theme-definitions"
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
    >
      {/* Video uses color matrices only, avoiding a texture layer per frame. */}
      <defs>
        {[false, true].map((motion) => (
          <filter
            key={String(motion)}
            id={motion ? "eloria-lapis-motion" : "eloria-lapis-art"}
            x="0"
            y="0"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            {/* Both G > R and G > B must hold; the ramp avoids hard color edges. */}
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -64 64 0 0 -.02"
              result="greenOverRed"
            />
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 64 -64 0 -.02"
              result="greenOverBlue"
            />
            <feComposite
              in="greenOverRed"
              in2="greenOverBlue"
              operator="arithmetic"
              k1="1"
              k2="0"
              k3="0"
              k4="0"
              result="greenDominant"
            />
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -20 32 -20 0 0"
              result="greenSaturation"
            />
            <feComposite
              in="greenDominant"
              in2="greenSaturation"
              operator="in"
              result="greenMask"
            />
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values=".12 .92 .16 0 0  .08 .25 .06 0 0  .12 .86 .22 0 0  0 0 0 1 0"
              result="lapis"
            />
            {!motion && (
              <>
                <feImage
                  href={veins}
                  preserveAspectRatio="none"
                  result="lapisVeins"
                />
                <feComposite
                  in="lapisVeins"
                  in2="lapis"
                  operator="over"
                  result="royalStone"
                />
              </>
            )}
            <feComposite
              in={motion ? "lapis" : "royalStone"}
              in2="greenMask"
              operator="in"
              result="coloredStone"
            />
            <feComposite
              in="SourceGraphic"
              in2="greenMask"
              operator="out"
              result="originalDetails"
            />
            <feComposite
              in="originalDetails"
              in2="coloredStone"
              operator="arithmetic"
              k1="0"
              k2="1"
              k3="1"
              k4="0"
            />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
