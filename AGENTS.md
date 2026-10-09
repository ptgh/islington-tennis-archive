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
- Mobile hub panels use a single shared sheet scroll surface in hub.css, including bottom safe-area spacing, so filters and actions remain reachable across every tab.
- The visitor guide's knowledge is `supabase/functions/ask-islington/scene-data.json`, generated from `src/data` by `bun scripts/build-scene-knowledge.ts`; rerun it after changing scene data so answers stay in sync (the edge function cannot import `src/`).
- Guide conversations are stored per browser in localStorage and addressed by `#/ask/<id>` hash links, because the app has no router.
- Live court times come from Better's OpenActive slot feed, harvested by the `better-slots-sync` edge function into `court_slots` on a 15-minute schedule; the court-to-venue map lives in that function, because Better groups courts across venues.
- Player cards live in `public.profiles` and are only shown to signed-in players who opted in, so the partner finder doesn't expose contact details publicly.
- The partner finder and Gear share the existing browser-local racquet card through explicit My frame links; racquet setup stays local and is not published with player contact details.
- Recovered racquet photographs use CDN asset pointers in the racquet photo registry, preserving the original source records and never substituting a different model.
- Court-neighbourhood close-up detail uses equivalent bounded radii at every town venue and instanced facade relief and layered foliage in the London club scenes; railway embellishments follow only the existing illustrative track, so court coordinates and transport paths remain unchanged.
