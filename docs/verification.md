# Implementation and verification

Completed locally on 21 September 2026. The starting workspace was empty; there was no existing UX, auth, database, routing or production integration to modify.

## Delivered behaviour

The working site combines an original, explorable Three.js miniature with a researched court directory. Six Islington locations are included, plus two optional nearby private/residents-only clubs. Search, access filters, court markers, source-linked details, external booking and directions links, day/night mode, station labels and a moving/pausable model train are implemented. No live availability, payment or reservation system is claimed.

## Design comparison

Reference: `docs/design-concept.png`, generated using the built-in Image Gen tool. The concept and the latest desktop/mobile browser screenshots were opened with `view_image` during final QA.

The design prompt asked for a complete Islington Tennis discovery screen inspired by Avon: a full-bleed orthographic miniature of brick terraces, trees, green courts, model trains and Angel/Highbury station markers; cream floating directory; forest-green controls; editorial serif headings; searchable public/private venue rows; day/night and map controls. It required usable, code-native UI and an actual WebGL model, rather than a screenshot used as the interface.

| Comparison point | Result / adjustment |
| --- | --- |
| Composition | Preserved the full-bleed town, floating left directory, quiet top bar, lower-left place title and right-side map controls. Fixed overlap between directory and place title. |
| Typography | Preserved editorial serif headings and compact readable controls. Used Libre Caslon Display and DM Sans with system fallbacks; the concept’s exact generated letterforms are not reproducible fonts. Fixed mobile heading spacing. |
| Palette | Warm cream panels, forest-green ink, sage terrain, warm brick and charcoal roofs. Fixed inward-facing roof geometry and excessive lighting that initially washed out the town. |
| Containers / spacing | One floating paper panel with divided venue rows, compact pills and consistent icon buttons. Tuned desktop spacing to show three complete initial rows at 1536×1024. |
| Icons / markers | Tennis/court/search controls, numbered green court pins, station roundels and restrained line icons match the concept’s visual language. Markers have actual 44×44 hit targets. |
| Scene assets | Intentional departure: original procedural, lower-detail 3D geometry supports free movement and a working train. It does not reproduce the concept’s photoreal model or imply exact building/road geometry. Highbury courts are split 8+3; ITC shows two outdoor courts plus an indoor hall. |
| Mobile | Directory becomes a collapsible sheet. Selected courts recenter above it. Short screens scroll the whole sheet. About remains reachable and collapsed controls are inert. |
| Copy | Core brand, heading, search and three initial venue names retained. Intentional changes: “Other access” includes school/residential restrictions more accurately than “Clubs”; nearby opt-in, count, source notes and illustrated-map label explain researched scope; exact court counts replace vague summaries. No unexplained marketing claims or availability claims added. |

The layout, palette, typography hierarchy, controls and responsive behaviour were verified against the concept. The town is an intentional procedural interpretation, not a pixel-identical or photographic reproduction.

## Checks actually performed

- `npm test`: four tests passed. They check borough/nearby scope, public versus restricted access, bookable court totals, multi-term case-insensitive search, empty results, unique IDs, source URLs and correct action classes.
- `npm run build`: TypeScript and Vite production build passed.
- Codex in-app browser used throughout; no standalone Playwright fallback was necessary.
- Desktop viewports: default 1280×720 and concept-native 1536×1024. Mobile: 390×844; short landscape: 667×375.
- Browser workflows: directory selection, map-marker selection, public/restricted filtering, nearby opt-in, search, no-result state, Back focus restoration, mobile collapse/expand, About dialog, zoom/rotate/reset, stations and train controls, and day/night mode.
- Verified the Highbury action resolves in the rendered UI to the official Better booking-calendar URL. Venue links were corrected against operator, council, school and club sources. No booking or payment was submitted.
- Checked that the selected mobile court is above the details sheet, there is no mobile horizontal overflow, short landscape can scroll to the last venue, collapsed sheet controls are excluded from the accessibility tree, and only one canvas exists after reload.
- Browser console inspection reported no warnings or errors during final checks.

Final screenshots: `desktop-preview.png`, `night-preview.png`, `mobile-preview.png`, `mobile-detail-preview.png` in this directory. The local preview is served at `http://127.0.0.1:5173/` while the development server is running.

## Files created

- `.gitignore`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- `public/favicon.svg`
- `src/main.tsx`, `src/App.tsx`, `src/styles.css`
- `src/components/Icon.tsx`, `src/components/CourtDirectory.tsx`, `src/components/CourtDetail.tsx`, `src/components/AboutDialog.tsx`, `src/components/TownMap.tsx`
- `src/data/venues.ts`, `src/data/venues.test.ts`
- `src/scene/createTown.ts`, `src/scene/types.ts`, `src/scene/TownMap.css`
- `scripts/fetch-geography.py`
- `README.md`, `research-courts.md`
- `docs/design-concept.png`, the four final screenshots, and this verification record

Dependencies are limited to React/React DOM, Three.js and the TypeScript/Vite build tooling. The image-generation reference is not shipped as the interactive scene. Build output and dependencies are ignored.

## Remaining limits

This is a researched starting directory, not a proven census of every unadvertised private court. Venue pins are approximate published site locations, not surveyed gates. OSM geometry endpoints rejected/timed out, so street/building/rail geometry is explicitly illustrative. Bookings, eligibility, prices and live availability remain with the operators. The site is local and has not been publicly deployed. WebGL fallback and reduced-motion handling are implemented; forced WebGL failure and OS-level motion preference changes were not browser-tested.
