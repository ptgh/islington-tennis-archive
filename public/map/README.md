# Islington map data

Derived from OpenStreetMap contributors, retrieved 30 October 2026.

- Data source: https://api.openstreetmap.org/api/0.6/map
- Islington boundary: https://api.openstreetmap.org/api/0.6/relation/51821/full
- Source grid: sixteen extracts covering -0.152,51.516,-0.075,51.580.
- Licence and attribution: https://www.openstreetmap.org/copyright (ODbL).

The source rectangle includes all of the stored borough boundary and context for the neighbouring clubs; its totals are not borough-only counts. Only rendering geometry/tags are retained. The cell database is distributed under the ODbL. Rendered heights, roofs, facade decoration, planting and street furniture may be illustrative.

`src/data/islington-geography.json` lists every cell and its content-addressed filename. Cells share the app's geographic projection and have no separate ground plates. `islington-overview.png` is baked from the same geometry for distant views; the app overlays source footprint geometry at street scale.

Regenerate with `scripts/import-islington-geography.py` followed by `scripts/bake-islington-overview.py`. Pillow is needed only for authoring the saved overview, not for application builds. Keep the source date and attribution visible when redistributing.
