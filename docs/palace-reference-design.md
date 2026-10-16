# Reference treasury implementation

The Persian home treasury below `HeroShowcase` now uses the two supplied reference photographs. This is a focused replacement of `HomePalace`; the existing home placement, hero, header, footer, collection routes, API, commerce, database and all environment files are retained.

- Desktop: original palace, hanging banners, three chests and eight selections. Two transparent photographic bronze braziers sit at the outside edges.
- Mobile through 900px: three horizontal cards in gold/silver/weave order. Each chest stands on a short marble plinth with a draped Persian rug. The original reference lettering and bracelet photographs are restored over the edited scene. Four selected bracelets retain the supplied mobile photographs.
- Entry: a hinged lid and the appropriate open chest image appear immediately. A 380ms camera move continues over the same scene across the Next route commit. The native link starts navigation in the click event; no timer, image decode, modal, new route or loading toast gates entry. Cleanup is bounded to 420ms; reduced motion bypasses the camera. Ctrl/Cmd-click, new tabs and native no-JavaScript links retain Next/browser behavior.
- Product images and names are reference artwork. Exact title matches from the existing preview API link to actual product slugs; otherwise links use the existing `q` catalogue search. The code invents neither inventory nor product slugs. A preview API outage does not hide artwork or links.

## Assets and performance

All new art is in `public/images/palace/reference/`. WebP filenames contain content hashes, compatible with the existing immutable image cache. `<picture>` media queries serve only the applicable mobile/desktop source; responsive widths and native lazy loading keep these below-fold assets out of the initial hero's critical path. No new runtime dependencies or WebGL renderer are added. Maximum selected artwork totals are approximately 575 KiB desktop and 607 KiB high-DPI mobile; these are byte budgets, not a measured live-site loading time. The live site and its network/server timing were not available for validation in this environment.

`palace-reference-assets.json` records dimensions, bytes, crop coordinates and SHA-256 hashes of both uploaded originals. The generating script crops and encodes only. Its six positional inputs are the two original JPEGs, the mobile plinth edit, mobile open-state edit, desktop open-state edit and transparent brazier PNG, in that order:

```sh
node scripts/generate-palace-reference-assets.mjs desktop.jpg mobile.jpg mobile-plinths.png mobile-open.png desktop-open.png brazier.png
```

The outputs are committed; asset generation is not needed for deployment.

## Validation

```sh
npm run typecheck
node --import tsx scripts/test-palace-recovery.ts
node scripts/test-source-integrity.mjs
npm run build
```

The component/motion tests cover immediate native entry, duplicate-click recovery, keyboard/pointer intent prefetch, Save-Data, preview API outage, exact-name product linking, original photo preservation, server-rendered lazy images, back navigation, camera lifetime, reduced motion, file decoding, real brazier alpha and image byte budgets.

Browser visual QA could not run because the required managed browser capability is unavailable. The mobile/desktop image assets were inspected directly. Full production-build status is recorded in the delivery notes; no production credentials or database were used.

### Delivery verification (2026-10-16)

- PASS: TypeScript `tsc --noEmit`.
- PASS: component/motion/asset tests above, including all three treasury routes, eight original selections, API outage, native navigation timing and cleanup.
- PASS: source-integrity check and `git diff --check`.
- BLOCKED by execution environment: the normal production build crashes in native SWC's Rust `stacker` before compiling application code. Retrying with Next's WASM compiler successfully loads the unchanged Next configuration, then fails with `ENOENT: uv_resident_set_memory` because system memory/process information is unavailable. A successful full production build is not claimed.
- NOT RUN: browser screenshots and a live Lighthouse/network audit. The managed browser capability is unavailable. Recheck the responsive controls and appearance on the deployment host before release.
- Unchanged: dependency/lock files, all env files, the database schema and existing server configuration.

## Image edit prompts

The built-in ImageGen tool supplied the requested physical additions and open states. The original two JPEGs remain unchanged.

1. **Mobile plinths, precise-object-edit:** Preserve the three-panel composition, camera, Persian lettering, jewellery circles, emerald panels, gold frames, palace columns, sunlight and identity/material/ornamentation of all three chests. Edit only the right scenes: place each chest realistically on a short square cream marble pedestal, with a detailed Persian woven carpet over the top and front. Keep the chest completely visible, natural contact shadows, carpet between chest and pedestal. Gold top, silver middle, wooden macrame bottom. No new labels or unrelated changes.
2. **Desktop open state, precise-object-edit:** Preserve the supplied palace framing and positions. Open all three existing chest lids backwards around their rear hinge. Keep body fronts, carpets and marble bases aligned. Left wooden chest contains emerald/burgundy macrame bracelets and cords; middle silver chest contains silver moon/flower charms and bracelets in dark emerald velvet; right emerald/gold chest contains gold jewellery and emerald/gold bracelets. Retain environment, water, light and architectural scale.
3. **Transparent brazier, product-mockup:** One complete photoreal ancient Persian bronze/gold brazier, isolated with genuine alpha transparency; carved fluted bronze pedestal, stepped base, shallow wide bowl with Achaemenid floral engraved gold border, natural amber/orange fire. Camera slightly above bowl, warm upper-left daylight, realistic patina. No text, setting, floor or cropped parts.
4. **Mobile open state, precise-object-edit:** On the plinth-edited three-card image preserve camera, Persian text, product images, plants, architecture, light, chest bodies, carpets and pedestals. Open only the three lids approximately 70 degrees. Gold/emerald jewellery in the top velvet-lined chest, silver moon/flower charms in the middle, green/burgundy/ivory macrame bracelets and braided threads in the bottom wooden chest. Keep body and base alignment; no other changes.
