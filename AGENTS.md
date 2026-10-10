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
