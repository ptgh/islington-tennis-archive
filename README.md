# Islington Tennis

A local, interactive tennis-court guide inspired by the miniature world at [avon.town](https://avon.town/). Built with React, TypeScript, Vite and Three.js.

## Run locally

Requires Node.js 22.12+ (tested with Node 24).

```sh
npm install
npm run dev
```

Open the local address shown in the terminal. `npm run build` checks TypeScript and produces `dist/`; `npm run preview` serves that production build. `npm test` checks directory filtering, access boundaries, coverage counts and handoff integrity.

## What works

- A real WebGL miniature with original procedural buildings, trees, courts, a canal, station landmarks and a moving model train.
- Drag to pan, scroll/pinch to zoom, right-drag or the rotate button to turn. With the map focused, arrow keys pan, +/− zoom and Home resets the view.
- Day/night lighting, station labels, a shared pause/play control for the world and reduced-motion defaults.
- Court close-ups with miniature players, rackets and a bouncing rally ball, plus people walking along park paths.
- Four researched coaching providers linked to their courts; gear and restringing services with physical shop pins where verified.
- Animated red buses and selectable route overlays for 19, 30 and 43, with official TfL travel-information handoffs.
- Search by venue, neighbourhood, postcode or station; filter public/restricted access; nearby clubs outside Islington are always included.
- Court details, source links, access conditions, transit directions and official booking handoffs.
- A mobile bottom sheet that can be hidden to explore the map, plus a directory fallback if WebGL is unavailable.

## Coverage and booking

The starting inventory contains six researched locations inside Islington: four public bookable venues (23 dedicated courts), the four school-reported courts at Elizabeth Garrett Anderson, and Spa Fields’ shared free-play court. Coolhurst and Barbican are nearby listings **outside the borough**. School, members-only and residents-only courts have distinct access labels and information links.

This is not an exhaustive census of unadvertised private courts. See [research-courts.md](research-courts.md) for sources, exclusions, conflicting information and remaining leads. The data was researched on 20 September 2026 and corrected against primary sources during implementation.

Booking is completed with the venue/operator. This app does not have a live availability feed, take payments or create reservations. There is no backend, authentication, database, analytics integration or API key requirement. Web fonts load from Google Fonts with local system fallbacks.

Coaching, shop services and transport were checked on 21 September 2026. See [research-hub.md](research-hub.md) and [docs/research-buses.md](docs/research-buses.md). Miniature people and vehicles do not indicate current court use or real-time bus locations. Shop stock, lesson spaces and opening hours must be confirmed with the provider. Collection-only services have no invented shop pin.

## Geography

Highbury Fields uses the eleven-court arrangement from a bundled OpenStreetMap extract, previously cross-checked in Google Maps. The displayed courts are enlarged to match the other miniature venues and keep the surfaces readable. Raw mapped geometry is retained separately. Google imagery is not embedded or copied; no runtime map API or key is required. Attribution appears on the map and in About.

The mixed-scale Highbury inset has been removed. All surrounding buildings, parks, trees and railway now share the town’s miniature treatment. Displayed court positions and dimensions, street layout, heights and floodlight placement remain stylised, including within Highbury; this is not a geographically accurate borough map. External directions use the venue name and postal address.

## Files

- `src/App.tsx`, `src/components/`: interface and discovery flow.
- `src/scene/`: Three.js town, map overlays and rendering lifecycle.
- `src/data/venues.ts`: researched venue inventory and filters.
- `src/data/venues.test.ts`: meaningful data and access regression checks.
- `src/data/hub.ts`, `src/data/busRoutes.ts`, `src/data/hub.test.ts`: sourced hub entries, route snapshots and data checks.
- `src/components/HubDirectory.tsx`, `src/hub.css`: hub navigation and service details.
- `src/scene/createTownLife.ts`: animated players, walkers and buses.
- `src/styles.css`: original shared visual design and responsive layout.
- `docs/design-concept.png`: generated design reference; original working UI is rendered in code.
- `research-courts.md`: research evidence and scope.

No existing application or production integration was present in the starting directory. This build is local and has not been publicly deployed.

## Hub increment: changed files

- Interface: `src/App.tsx`, `src/hub.css`, `src/components/HubDirectory.tsx`, `src/components/CourtDetail.tsx`, `src/components/TownMap.tsx`, `src/components/Icon.tsx`, `src/components/AboutDialog.tsx`.
- Scene: `src/scene/createTown.ts`, `src/scene/createTownLife.ts`, `src/scene/types.ts`.
- Data and regression checks: `src/data/hub.ts`, `src/data/busRoutes.ts`, `src/data/hub.test.ts`.
- Documentation: `README.md`, `research-hub.md`, `docs/research-buses.md`.

No dependencies, booking integrations, authentication, database or payment behavior changed in this increment.

## Play together increment

Five sourced community options now connect to map pins at Highbury Fields, Islington Tennis Centre and Rosemary Gardens. Filter social sessions or partner-finding programmes, choose a court, inspect joining requirements, locate associated courts and continue with the official organiser. Court details also link directly to relevant play options. Pins count programmes, not people or available places.

Sources were checked on 22 September 2026; see [research-social.md](research-social.md). Conflicting Highbury mix-in times and fees are explicitly left for organiser confirmation. This is discovery through existing organisations, with no player profiles, messaging, live session availability or in-app enrolment.

Changed files for this increment:
- Interface: `src/App.tsx`, `src/components/PlayTogether.tsx`, `src/components/HubDirectory.tsx`, `src/components/CourtDetail.tsx`, `src/components/TownMap.tsx`, `src/play.css`.
- Data and checks: `src/data/play.ts`, `src/data/play.test.ts`, `src/data/hub.ts`.
- Documentation: `README.md`, `research-social.md`.

No dependencies or booking, payment, authentication or persistence integrations changed.

## Centre programme and living weather — 24 September 2026

- The centre details and Coaching tab share the complete 14-coach directory published by Better. Individual coaches are searchable by name, court or specialty, with public phone links and official-source handoffs. Adult/junior courses, adult social doubles and casual coaching have expandable timetables. Conflicting junior age bands are flagged for confirmation.
- Desktop and mobile both offer Explore map / Tennis hub controls. Hidden panels are inert; map focus accounts for the hidden panel. Court pins no longer inherit transform animation and are anchored at ground level.
- Five parks and the Barbican Centre provide approximate orientation labels. These are reference points on an illustrative town, not surveyed park boundaries.
- Weather uses Open-Meteo's hourly area forecast, fetched only when opening or refreshing Weather. It provides temperature, precipitation probability and wind, handles failure, and does not request a user's location. Default rain is explicitly labelled an illustrative preview. Forecast mode is separate.
- Cloud groups now occupy fixed world positions rather than a screen overlay. Rounded crowns and rain banks, 1,600 falling drops and ground ripples share the 3D scene; snow has separate particles. Pause world also pauses precipitation, and reduced-motion defaults remain respected. No cloud footprint drifts when the camera moves.

Changed files across this increment: `src/App.tsx`, `src/components/CourtDetail.tsx`, `src/components/HubDirectory.tsx`, `src/components/CentreProgramme.tsx`, `src/components/TownMap.tsx`, `src/components/Weather.tsx`, `src/data/centre.ts`, `src/data/centre.test.ts`, `src/data/hub.ts`, `src/data/hub.test.ts`, `src/data/play.ts`, `src/data/play.test.ts`, `src/data/places.ts`, `src/data/weather.ts`, `src/data/weather-scene.test.ts`, `src/scene/createTown.ts`, `src/scene/TownMap.css`, `src/scene/createWeather.ts`, `src/living-map.css`, and this README.

Sources: [Better's full centre programme](https://www.better.org.uk/leisure-centre/london/islington/islingtontc/tennis), [Open-Meteo documentation](https://open-meteo.com/en/docs), [Islington parks](https://www.islington.gov.uk/physical-activity-parks-and-trees/parks-and-green-space/your-local-parks/caledonian-park), [Barbican visitor information](https://www.barbican.org.uk/your-visit/general-info/getting-here). Centre source checked 22 September 2026. Booking and enrolment remain external. No dependencies, database, auth or payment changes.

### 25 September — shops, orientation and weather access
- Added Wigmore Sports (official site checked 25 September: 39 Wigmore Street, racket specialists, demos and stringing), with the same directory, map pin, website and directions treatment as Hackney Tennis Shop. Removed Sports Direct Angel. Collection-only Sweet Spot remains unpinned.
- Added a Places menu to fly to the Barbican, Union Chapel and named parks, including Clissold Park. Increased label contrast. These are approximate orientation markers, not architectural reconstructions.
- Added King's Cross St Pancras, Euston and Old Street station markers. Dashed Northern Bank-branch and Victoria connections explain approaches into Islington. Selected connections only, not actual tunnel geometry or live service status. Sources: TfL Northern line diagram and Victoria timetable; Barbican getting-here page; Union Chapel official contact page.
- Weather effects now have a direct on/off switch; Forecast opens details separately. Illustrative rain remains the initial effect.
- Changed files: `src/data/hub.ts`, `src/data/places.ts`, `src/data/transit.ts`, `src/components/MapPlaces.tsx`, `src/components/Weather.tsx`, `src/components/TownMap.tsx`, `src/scene/createTown.ts`, `src/App.tsx`, `src/living-map.css`, `README.md`.
- Verification: 14 existing tests passed; TypeScript and production build passed (existing Three.js chunk-size warning). Browser verified weather-off state, Places menu, flight to visible Barbican marker, and revised shop directory. No booking/API wiring or dependencies changed.

Suggested next increments: a map-based “play today” session filter; saved favourite courts; a short animated neighbourhood tour; a borough data pack containing venues, services, orientation points and source-check dates. Add Emirates Stadium, Caledonian Clock Tower and Estorick Collection as researched landmark candidates before broader rollout.

### Discovery features — 25 September
- **Play today:** filters the existing sourced weekly social programme by London weekday, refreshing the day every minute. Includes sessions earlier in the day; it is not live availability. Unknown/flexible schedules are excluded. Map programme counts follow the filter.
- **Favourites:** star controls alongside court rows, a favourites-only filter, local browser persistence, and graceful recovery from malformed/obsolete stored IDs. Storage failure is shown as visit-only saving. No account or backend added.
- **Places tour:** four user-paced stops with animated map flights, next/restart/end controls and explanatory copy. Uses existing map motion behaviour. Added approximate orientation markers for Emirates Stadium, Caledonian Clock Tower and Estorick Collection, verified against Arsenal visitor information, Islington Council Caledonian Park page and Estorick visitor information. Labels are not building reconstructions.
- **Borough foundation:** `src/data/borough.ts` gathers venues, services, play, places, transport and tour content. This is a content boundary, not a completed multi-borough engine: scene geometry, projection, weather area and branding still need deliberate adaptation for another borough.
- Files changed: `src/App.tsx`, `src/components/CourtDirectory.tsx`, `src/components/PlayTogether.tsx`, `src/components/MapPlaces.tsx`, `src/data/play.ts`, `src/data/places.ts`, `src/data/borough.ts` (new), `src/data/favourites.ts` (new), `src/data/discovery.test.ts` (new), `src/living-map.css`, `README.md`.
- Checks: 16 passing tests including London summer-midnight day rollover and malformed favourites storage; production build; browser save/filter/reload/unsave, today results and tour progression; desktop and 390px mobile visual inspection; no browser console errors. Test favourite removed after verification. Existing Three.js chunk warning remains.
- Landmark sources: https://www.estorickcollection.com/visitor-information ; https://www.islington.gov.uk/physical-activity-parks-and-trees/parks-and-green-space/your-local-parks/caledonian-park ; https://www.arsenal.com/sites/default/files/documents/Arsenal%20Visiting%20Supporters%20Guide.pdf

### Tennis-first visual correction — 25 September
- Removed all fixed park/landmark text overlays and the floating rain-preview caption. Court interaction labels and the separately toggled station layer remain. Weather stays a direct on/off control with optional forecast details.
- Bearings now offers buildings with actual miniature geometry: clock tower with clock faces, chapel with tower/rose window, stadium bowl, Georgian gallery and a concrete Barbican complex. These are stylised models, not surveyed architectural reconstructions. Background houses/trees are excluded from their footprints. Removed the old misplaced generic stadium.
- Tennis tour now visits four tennis venues. Added a miniature rally at the Barbican residents' courts and aligned its visit-button wording; access restrictions and official booking handoffs are unchanged.
- Verified Better's public facility/slot feeds with read-only requests. Documented concrete records, historical-feed risks, individual-court mapping and the operator-access blocker for in-site checkout in `docs/tennis-data-integration.md`. No live availability or direct booking integration is claimed.
- Files: `src/components/TownMap.tsx`, `src/components/Weather.tsx`, `src/components/MapPlaces.tsx`, `src/components/CourtDetail.tsx`, `src/scene/createTown.ts`, `src/scene/createLandmarks.ts` (new), `src/data/borough.ts`, `src/data/landmarks.test.ts` (new), `src/living-map.css`, `docs/tennis-data-integration.md` (new), `README.md`.
- Checks: 17 tests passed, TypeScript/production build passed; desktop browser confirmed no park/landmark overlays or rain caption, clock-tower/Barbican building destinations and players on the Barbican court. Browser console errors: none. Existing Three.js chunk warning remains; this correction was not separately rechecked on mobile.

### Tennis discovery and miniature services — 25 September
- Nearby clubs are always included; removed the opt-in and obsolete empty-state guidance. Existing access filters still distinguish public and restricted venues.
- Station roundels remain on the map; Stations controls their names, including on mobile.
- Coaching uses the same pin silhouette and count treatment as Play together, with a tennis-ball icon. Selecting a location filters its coaches/programmes; the centre has 14 coach entries plus its course programme.
- Renamed Gear & care to Gear. Wigmore and Hackney have miniature shopfront buildings at their mapped positions.
- Sweet Spot Stringer has a cream/green miniature van on an illustrated avenue. Its moving marker opens the service and follows the van close up; leaving the service stops following. Pause world pauses the van. This is an illustrated collection service, not live tracking. Shopfronts are stylised rather than surveyed facades.
- Files changed: src/App.tsx, src/components/CourtDirectory.tsx, src/components/HubDirectory.tsx, src/components/TownMap.tsx, src/scene/TownMap.css, src/scene/createGear.ts (new), src/scene/createTown.ts, src/scene/types.ts, README.md.
- Verified: all 17 existing tests pass; TypeScript and production build pass; desktop browser checked eight default venues, station names off with roundels retained, coaching pin counts and centre-only filtering, the moving van close-up and Hackney shop model. Browser error log empty. Mobile station-name CSS was corrected but this increment was not separately visually tested on mobile. Existing Three.js bundle-size warning remains.
- Product direction: tennis discovery and community; no in-site booking or live availability integration added. Earlier booking API research is reference only, not the current roadmap.

### Travel and tennis planning — 25 September
- Station names now start off and buses start on; changing hub sections preserves the bus toggle unless opening Bus routes explicitly. Icons remain visible.
- Added Highgate, Barbican, Bond Street, Manor House and Essex Road using TfL StopPoint coordinates. Added contiguous local TfL route geometry for 139 (near Wigmore/Selfridges) and 393 (Clissold Road–Highbury). Shop cards explain onward walks. These are selected route sections, not live bus tracking.
- Fixed the van cutting across missing park roads: it now follows the same route 19 geometry used for a continuously rendered road. A regression test checks its position against that road and verifies pause behaviour.
- Estorick now has entrance banners, a walled sculpture garden and glazed extension to distinguish the stylised gallery building.
- Added indoor/floodlit court filters, coaching-level filters based on published descriptions, and an expandable weekly social calendar using existing sourced programmes. Calendar follows current filters and is not live attendance or availability.
- Centre details include Better's adult/junior off-peak pricing hours, checked 25 September. These are not measured peak demand or a guarantee of free courts. No in-site booking or live court-availability feed added.
- Files changed: src/App.tsx, src/components/CourtDirectory.tsx, src/components/CourtDetail.tsx, src/components/HubDirectory.tsx, src/components/PlayTogether.tsx, src/components/TownMap.tsx, src/data/transit.ts, src/data/busRoutes.ts, src/data/gear-scene.test.ts (new), src/scene/createGear.ts, src/scene/createLandmarks.ts, src/play.css, README.md.
- Verification after computer restart: all 18 tests passed; TypeScript/production build passed; local Vite server restored on 127.0.0.1:5173. Browser verified layer defaults, indoor filtering and weekly calendar; responsive layout visually inspected. Full mobile interaction matrix and architectural fidelity were not verified. Existing Three.js chunk-size warning remains.
- Sources: https://api.tfl.gov.uk/Line/139/Route/Sequence/outbound ; https://api.tfl.gov.uk/Line/393/Route/Sequence/outbound ; https://api.tfl.gov.uk/StopPoint/940GZZLUHGT (and corresponding station IDs) ; https://www.better.org.uk/leisure-centre/london/islington/islingtontc/prices

### Control polish and floodlit nights — 25 September
- Removed the persistent drag/scroll instructions; accessible map instructions remain available to assistive technology. Shortened About, aligned map-pill heights, padding and typography, and moved the weather-effects switch inside Forecast.
- Replaced the cramped facilities dropdown with native keyboard-accessible Any / Indoor / Floodlit radio segments and more separation from access filters.
- Night mode now shows lamp heads, poles, softly illuminated surfaces and light pools at venues whose published lighting field indicates floodlights. This is illustrative, not live operating status; unverified/daylight venues stay unlit. No additional dynamic lights or dependencies added.
- Changed files: src/App.tsx, src/components/CourtDirectory.tsx, src/components/Weather.tsx, src/living-map.css, src/scene/createTown.ts, src/scene/types.ts, README.md.
- Verification: TypeScript/production build and all 18 tests passed. Browser verified Floodlit returns four venues, night switching illuminates Highbury courts, and responsive controls/selector render correctly. Existing Three.js chunk-size warning remains. Lamp positions and pools are artistic rather than surveyed lighting geometry.

### Dropdowns, Highbury geometry and rendering — 26 September

- Replaced the remaining native selects in Coaching, Play together, Forecast and Places with a shared styled listbox. Menus are bounded to the viewport, open above when needed, and support arrows, Home/End, Enter, Escape and type-ahead. Existing filters and provider links are preserved.
- Rebuilt Highbury's eleven courts at mapped scale and orientation: three to the northwest and eight in separate eastern groups. Added surrounding OSM park, road/path and building footprints, with mapped trees. Route 19 follows Highbury Grove beside the courts. Bus/van models and animated players were rescaled for the corrected courts.
- Shared court exclusion areas prevent procedural roads, scenery and buses from appearing inside court enclosures. Highbury's full route geometry clears every court; elsewhere an intersecting legacy route segment/vehicle is hidden, rather than inventing a diversion. Wider illustrated layouts still need separate geographic correction.
- Added visible night-only lamp halos, soft shafts and court light pools. Lighting is a visual mode, not a report of operating hours. Court materials retain their markings; light positions are illustrative.
- Raised the device-pixel-ratio cap from 1.65 to 2.5, with an 8.5-million-pixel canvas limit; doubled shadow-map resolution to 4096 and concentrated shadows around close-up views. Actual resolution follows the screen's pixel ratio. Highbury close-ups now zoom to the mapped court scale.

Sources: [Google Maps visual reference](https://www.google.com/maps/search/Highbury+Fields+tennis+courts/); [OpenStreetMap area extract](https://api.openstreetmap.org/api/0.6/map?bbox=-0.106,51.547,-0.096,51.554), retrieved 25 September 2026; [OSM attribution and ODbL](https://www.openstreetmap.org/copyright). The bundled extract is `src/data/highbury-geography.json` (11 courts, 258 road/path ways, 724 building footprints, 144 trees).

Files changed in this increment:
- Interface: `src/components/SelectField.tsx` (new), `src/components/SelectField.css` (new), `src/components/Weather.tsx`, `src/components/HubDirectory.tsx`, `src/components/MapPlaces.tsx`, `src/components/PlayTogether.tsx`, `src/components/TownMap.tsx`.
- Map: `src/scene/courtGeometry.ts` (new), `src/scene/createHighbury.ts` (new), `src/scene/createCourtLighting.ts` (new), `src/scene/createTown.ts`, `src/scene/createTownLife.ts`, `src/scene/createGear.ts`, `src/data/highbury-geography.json` (new), `src/data/busRoutes.ts`.
- Attribution and checks: `src/App.tsx`, `src/components/AboutDialog.tsx`, `src/living-map.css`, `src/data/geography-scene.test.ts` (new), `README.md`.

Verified: 20 tests and TypeScript/production build passed. New regressions sample all bus paths against Highbury court enclosures, check court dimensions, and verify night light visibility/anchoring; the existing van road-following/pause test also passes. Browser checks covered desktop Coaching keyboard selection/Escape, Forecast End/Enter selection, both menus at 390px, live forecast loading, and Highbury's day/night close-up. Higher-resolution hardware and sustained frame rate were not benchmarked. The build still warns about JavaScript chunks over 500 kB; bundled geometry increases the main chunk. No dependencies or booking, auth, database, payment or live-data integrations changed.

### Whole-map rendering and court visibility — 27 September

- Removed the tiny Highbury inset and its mismatched surrounding geometry. Its eleven-court arrangement now uses the same enlarged miniature scale as the wider town. Shared exclusion footprints keep scenery and rendered traffic clear of the enlarged courts. This supersedes the previous increment's mapped-scale rendering; source coordinates remain available as reference data.
- Blue playing areas and thicker white markings are visible above their surrounds. Court visits fit the complete group and floodlights; resizing cancels an obsolete camera flight before applying the new framing. Clouds fade where they would obscure courts.
- Applied textured brickwork, slate roofs, cornices, dormers, chimneys, window/door details, denser tree crowns and masonry railway arches across the procedural town. Neutral lighting, contact shading and antialiasing replace the yellow wash. Night mode has visible lamp halos and beams with restrained court-surface glow.
- Split large repeated scenery batches into spatial cells so off-screen geometry can be culled. A geometry audit of the default desktop view rejected approximately 87% of scene triangles; this is not an FPS benchmark. Retained the 2.5 DPR / 8.5-million-pixel cap.
- Reviewed LTA/ClubSpark's public documentation and course feed. Findings and the unconfirmed booking-access requirements are in [tennis-data-integration.md](docs/tennis-data-integration.md#lta--clubspark-review--27-september-2026). No booking integration or new dependencies added.

Changed implementation files: `src/components/TownMap.tsx`, `src/components/AboutDialog.tsx`, `src/scene/miniatureMaterials.ts` (new), `src/scene/courtGeometry.ts`, `src/scene/createHighbury.ts`, `src/scene/createTown.ts`, `src/scene/createCourtLighting.ts`, `src/scene/createWeather.ts`, `src/scene/TownMap.css`, and `src/data/geography-scene.test.ts`. Documentation: this README, `docs/tennis-data-integration.md`, and four screenshots in `docs/verification/` dated 2026-09-27.

Verification: 21 tests passed, including enlarged court/traffic clearance and night-light state; TypeScript and production build passed. Browser checks covered desktop day/night, all eleven Highbury courts at 390px, Rosemary Gardens' close-up markings, keyboard return/navigation and empty error/warning logs. Actual screenshots: [day map](docs/verification/map-day-2026-09-27.png), [night lights](docs/verification/map-night-2026-09-27.png), [mobile court framing](docs/verification/map-mobile-2026-09-27.png), [Rosemary close-up](docs/verification/map-rosemary-2026-09-27.png).

Remaining limits: this is a more detailed real-time miniature, not a faithful reproduction of the generated concept's photoreal architecture and foliage. Buildings/roads remain stylised outside the checked court arrangement; the map is not navigation-grade geography. Sustained performance on low-power phones and high-DPI hardware is unmeasured. The existing Three.js chunk-size warning remains. Auth, persistence, routing, external handoffs and backend behavior are unchanged.

### Tennis atlas and visual refinement — 3 October 2026

- Added an optional Tennis atlas alongside the Islington map. Wimbledon and The Queen’s Club have separate illustrated London destinations and official visitor links; neither is counted as a local playable court. A world/Europe view presents a curated upcoming tournament calendar with category filters, source links, date notes and a visible editorial check date. The About dialog links to the LTA’s ways-to-play and event-calendar pages. See [tennis-atlas-research.md](docs/tennis-atlas-research.md) for record sources and maintenance limits.
- Increased the About/transport source-credit text to a readable size. The town now has more varied terrace heights and façade tones, lighter slate roofs, richer foliage and distinct paving. These treatments apply throughout the explorable procedural scene. Highbury’s blue court surfaces and white markings remain prominent in the default view and close-ups.
- The atlas is a curated local data file, not a live tournament feed. Booking remains with the operators; no in-site booking, new dependency or third-party map API was added. The real-time scene still does **not** match the generated concept’s photographic detail or geographic fidelity. A map-wide match would require a dedicated high-detail 3D asset and survey pipeline; the static concept image cannot serve as a truthful pan-and-zoom map.
- Visual checks: [Islington map](docs/verification/map-home-2026-10-03.png), [Highbury courts](docs/verification/map-highbury-2026-10-03.png), [London icons](docs/verification/atlas-london-2026-10-03.png), and [world tennis diary](docs/verification/atlas-world-2026-10-03.png).

### Court-side London views — 4 October 2026

The Atlas now opens large, interactive grass-court miniatures for Wimbledon and The Queen’s Club. Each has selectable courts, pan/zoom/reset controls, venue access notes, the next tournament date and official visitor links. These are editorial court scenes, not measured grounds plans or an indication that club courts are publicly bookable. The racquet room also gives Serena Williams’s SW102 photograph the same soft image treatment as the other frames.
