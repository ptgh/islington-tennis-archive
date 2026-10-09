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
- The visitor guide's knowledge is `supabase/functions/ask-islington/scene-data.json`, generated from `src/data` by `bun scripts/build-scene-knowledge.ts`; rerun it after changing scene data so answers stay in sync (the edge function cannot import `src/`).
- Guide conversations are stored per browser in localStorage and addressed by `#/ask/<id>` hash links, because the app has no router.
