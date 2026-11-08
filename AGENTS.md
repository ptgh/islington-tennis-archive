<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Atlas club views share one renderer and retain at most the two club worlds until the atlas closes; hidden club and town views suspend drawing, so revisiting venues avoids rebuilding geometry without reducing detail.
- Mobile club details use a bounded independent scroll sheet and an Explore map toggle inside the atlas content area, so safe-area controls and final links remain reachable.
- The mobile guide uses a bounded glass sheet sized to the visual viewport, with a fixed composer and independently scrolling transcript, so browser chrome and the keyboard cannot hide the send control.
- The account circle reuses the existing player-card forms and racquet-room destinations; verified auth state controls its signed-in indicator without introducing a second profile system.
- Startup uses the original ball artwork through a project-owned CDN pointer in a dedicated LoadingScreen; it fades away on map readiness and respects reduced motion without changing scene rendering.
- Mobile hub panels use a single shared sheet scroll surface in hub.css, including bottom safe-area spacing, so filters and actions remain reachable across every tab.
- The visitor guide's knowledge is `supabase/functions/ask-islington/scene-data.json`, generated from `src/data` by `bun scripts/build-scene-knowledge.ts`; rerun it after changing scene data so answers stay in sync (the edge function cannot import `src/`).
- Guide conversations are stored per browser in localStorage and addressed by `#/ask/<id>` hash links, because the app has no router.
- Live court times come from Better's OpenActive slot feed, harvested by the `better-slots-sync` edge function into `court_slots` on a 15-minute schedule; the court-to-venue map lives in that function, because Better groups courts across venues.
- Public live-feed access is limited to upcoming supported-venue slots and Better freshness fields; sync cursors and errors stay service-only so visitors retain availability without seeing internal state.
- Player cards live in `public.profiles` and are only shown to signed-in players who opted in, so the partner finder doesn't expose contact details publicly.
- The partner finder and Gear share the existing browser-local racquet card through explicit My frame links; racquet setup stays local and is not published with player contact details.
- Recovered racquet photographs use CDN asset pointers in the racquet photo registry, preserving the original source records and never substituting a different model.
- Court-neighbourhood close-up detail uses equivalent bounded radii at every town venue and instanced facade relief and layered foliage in the London club scenes; railway embellishments follow only the existing illustrative track, so court coordinates and transport paths remain unchanged.
- Club terrace roofs triangulate the original mapped footprint and split at the ridge, so long residential rows gain pitched detail without replacing their geography with rectangular blocks.
- Scene quality uses shared pixel budgets, a locally generated sky environment, capped contact-occlusion buffers and one shared lens-finish pass (tilt-shift, grade, vignette, grain) in renderQuality, so every 3D view gets the same photographic look without external downloads.
- Club and Islington court finishes share owned CC0 PBR asset pointers, wear shaders, weathered concrete edging and diamond fencing; recorded surface types select finishes, town unknown/mixed surfaces retain their hard-court illustration, and owned cleanup plus paused-view invalidation keep textures reliable without inventing court facts.
- Both 3D views take tone mapping and their day/night grade from `SCENE_TONE_MAPPING` / `applySceneGrade` in renderQuality (Neutral, measured against docs/design-concept.png), and the tilt-shift blur is authored in CSS pixels via `resizeLensFinish`; never set exposure or tone mapping per view.
- Town tree crowns cast shadows only through low-poly proxies on `SHADOW_PROXY_LAYER`, which TownMap's shadowMap wrapper enables for the shadow pass alone; full crowns casting shadows cost ~4x the crowns themselves. Garden and avenue trees use compact crowns and their own random stream so existing park trees keep their positions.
- Floating map cards (Places, Forecast, Time) are owned by App's single `card` state: one open at a time, an open card layers above the launchers, and on phones a card retracts the hub sheet (restored on close unless the card moved the map; opening the sheet closes the card). New floating cards must use `cardProps`, not their own open state.
- Map pins show the next free court from Better's feed via `useNextFreeCourts` and the pure helpers in `src/data/freeCourts.ts`; the feed-freshness rule (`feedIsFresh`: caught up, synced within 90 minutes) is shared with LiveCourtTimes, so stale data hides chips and lists alike.
- Streets never stop dead at a park: main avenues cross it as footpaths, side streets run on to a perimeter walk just outside each park ellipse (createTown `parkPaths`).
- In the illustrative town, bus routes follow one shared line, `busRouteLine` (courtGeometry): it takes the shorter arc around the illustrated Highbury Fields (`HIGHBURY_PARK`, drawn far larger than life, so its real bounding streets fall inside it) and then bends around court enclosures. The drawn roads, the buses, the stringer van and their tests all use it; never project route points without it, or a road will cross the park or a court and buses will vanish there.
- Miniature cars and cyclists shuttle along their safe stretch and turn round at each end (lane swing, smoothed heading); they never shrink away or hide mid-road. Stretches exclude courts in both lanes.
- Directory timing choices share a two-day Better snapshot, apply London-time filters locally and use the same feed-freshness rule as map pins; missing or partial feed data never proves a court is full. Timing preferences and favourites remain browser-local, and comparison links hand booking to the existing operators.
- The main map is one continuous Islington source world (`createIslington`), with a source-derived whole-borough overview and nearby 3D footprint cells in shared geographic coordinates. Source data covers the complete stored borough boundary plus neighbouring clubs; camera/framing changes never swap neighbourhood worlds. Cells load two at a time, draw at most twenty nearby cells on desktop and sixteen on phones, retain four more than that, and appear only when that budget nearly fills the view (`detailCellsInView`), so 3D never sits on the overview as a hard-edged patch; eviction and closing dispose geometry, instances and owned textures. Recorded heights/levels are used where available, otherwise detail remains illustrative. The main map uses one world unit per ten metres, while club worlds use metres; the grass shader receives that scale explicitly.
- Map controls and cards fit the visible viewport, including browser pinch zoom. All hub panels use one scroll surface on desktop and mobile. The Stringer movement API takes a frame delta; passing elapsed time accelerates the van and destabilises camera following.
- Cameras use TfL's complete public JamCam directory, with nearby and London-wide search, explicit availability and labelled cached data on refresh failure. Cameras outside the source-map bounding box have image views without moving into unsupported geography.

- Streamed borough activity shares owned model assets and bounded per-cell instances; only visible detail animates. Roads, paths, surface rails and whole narrowboat hulls stay within checked source runs, and pause freezes activity, ripple and wind clocks. The Time card calculates estimated Islington sun/moon information locally, using London civil dates and the shared lighting model.

- Continuous Islington transport uses `borough-transport.json`, generated by `node --experimental-strip-types scripts/build-borough-transport.ts` from connected source carriageways; buses, route ribbons and the Stringer van share those vertices. The 45-second bus tours stop on the road near a public court and report the remaining straight-line distance before framing the courts; they never invent a road into a park or court.

- The real borough outline is drawn by `createBoroughBoundary`: a faint wash outside it, a cream line along it, and neighbour names as HTML labels. Both overlays fade out by street zoom. Keep them out of the AO pass by staying transparent children of the world root.
- The furthest zoom-out fits the whole borough (`boroughFitZoom`); panning stops at the surveyed rectangle and the overview dissolves into the surround at its edge. Phones load `islington-overview-phone.webp`, baked by the same script as the full PNG.
- `buildingHeight` takes the footprint: pass `points` from every caller, so a shed with no recorded height is one storey everywhere it is drawn or highlighted.
- Borough road users shuttle on fixed runs and wait for clear space, so `lifePaths` rejects runs that cross or share a junction with one already chosen in the cell; without that they hold each other up for good.
- On desktop, Stations, Buses, Trains, Pause world, Cameras and Quality fold behind `MapLayers`. Phones keep their existing row: the same buttons, unwrapped by CSS.
- Only one of the hub, a floating card or the guide is open at a time, on every screen size (App). A new overlay goes through `cardProps`, or must drop the others the same way.
- Long camera journeys rise to a height where the overview is sharp and descend onto cells loaded in advance (`flightPlan`, `prepareFlight`); never fetch cells the camera only passes over. Cells build across frames from `buildBoroughTile`, so streaming cannot freeze a move.
- The outside wash sits below court surfaces, buildings and trees (`WASH_HEIGHT`) and relies on the depth test, so anything standing on the map stays at full strength.
- Mapped courts no venue covers are labelled from `src/data/otherCourts.ts`. A new map import must assign every unlinked court to a site; the test fails otherwise.
- With only miniature traffic moving the map draws at 30 fps (`IDLE_FRAME_MS`), and resolution adapts only while the camera moves. Window sills and glazing bars are separate meshes, shown from `FINE_DETAIL_ZOOM`; at map scale they are sub-pixel and most of the triangles.
- Named court sites share the venue visit flow: their ids go through the same `visitCourt`, from a map label or the Courts list (`watchableCourts`). Anything repositioned every frame by transform must set `transition:none`, because `button` has a global transform transition.
- The boundary line carries a travelling stroke (`TRACE_LAP_SECONDS`) that advances with the world clock and is off for reduced motion. It replaced a stronger wash: keep the wash faint.
- `.app` follows the visual viewport, so a browser pinch-zoom reads as a resize: never move the camera from `resize` unless it is still at its home view and the page is not pinched. Wheel and pinch gestures over map pins and floating buttons are forwarded to the canvas (`wheelBelongsToMap`).
- Every court drawn on the map opens its rally when tapped (`courtPicker`, ground point against the drawn enclosure). A tap is under 6 px and 500 ms; anything longer is the map being dragged. Double-clicking a court must not trigger the map reset.

