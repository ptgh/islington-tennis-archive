# Replacing the illustrated town with geographic London

Status: 27 October 2026. The public town is still an illustration. This change
adds a development-only, bounded Caledonian layout pilot; it does not make the
published map geographically accurate.

Open locally: <http://127.0.0.1:5173/?layout=caledonian>.

## What the existing scene gets wrong

- `createTown.ts` authors eight main avenues and generates a sinusoidal side-road
  grid. Its buildings follow those invented roads, not actual London plots.
- Most park outlines are ellipses. The canal and visible railway are authored
  curves. Routing these around enlarged courts improves continuity, not accuracy.
- `renderedHighburyCourts` enlarges the source courts by 4.4 and relocates them
  for legibility. The other town courts and sports hall are also enlarged models.
- The recorded clock-tower point (51.5485, -0.1225) is about 170 metres from the
  centroid of OSM way 37371124. The model uses brick, while Historic England
  identifies Portland stone. Moving it alone would place it inside the current
  oversized sports-hall model; the district needs to change together.

## Working pilot

The importer retains WGS84 way vertices, shared road nodes, source IDs and a
small whitelist of rendering tags. It discards contributor/contact metadata.
The application makes no new runtime requests to a map provider.

- Coverage: bbox west -0.129, south 51.543, east -0.113, north 51.551; about
  1.1 by 0.9 kilometres around Caledonian Park, Market Road and the tennis centre.
- 1,998 source features; 1,028 building-tagged ways, including two roof ways;
  1,026 building footprints rendered; 219 mapped trees.
- Actual Caledonian Park outline, sports-hall outline and outdoor court polygons.
- Clock tower centred on its mapped footprint. Council-reported height 47.5 m;
  pale stone, five-stage massing, open upper chamber and pyramidal slate roof.
  The architectural detail is an interpretation, not a measured replica.
- A single shared local projection is approximately ten metres per scene unit.
  Source footprint vertices and relative positions stay intact. Courts are not
  enlarged. This local projection is approximate, not a survey coordinate system.
- Shared finish, lighting, quality, weather and pause infrastructure is reused.
  Geometry is batched by material and neighbourhood. Mapped tree crowns keep the
  shadow-proxy architecture.

The preview has deliberately limited coverage: only two building ways contain
height tags and 63 contain levels. Untagged heights default to an explicitly
estimated 9.3 m (3 m for sheds/garages); storey-based heights are estimates too.
Road widths, most roof forms and facade details are also estimates. Five park or
building area relations are recorded as omitted; multipolygon holes are not yet
handled. Terrain and bridge/rail elevations are not resolved. Only mapped trees
are shown, so this is not a complete canopy map.

The pilot does not supply the town bus/train/collection-van simulation or a new
pedestrian routing graph. Its real court positions can be previewed, with the
existing decorative rallies. Other directory venues lie outside this extract.
The normal published view and existing operational integrations remain intact.
Vite removes the pilot branch and its dataset from production bundles; verify
that after each build before claiming it is isolated.

## Work needed before changing the public default

| Pass | Concrete result | Acceptance check |
| --- | --- | --- |
| Complete geographic base | Expand verified extracts across Islington and the nearby listed venues; support multipolygons, courtyards, holes, bridges and tunnels | Required venues inside coverage; source geometry, topology and counts checked; no invented connecting roads |
| Reconcile all scene objects | Move every court/hall, landmark, station entrance, canal and railway to mapped geometry at one scale | Pins, practice cameras, buildings and courts agree; no oversized compounds or false station buildings |
| Height and terrain enrichment | Use mapped heights where present; investigate licensed Environment Agency DSM/DTM differences for missing heights and terrain | Track source, survey date and confidence; roof/vegetation filtering and landmark spot checks |
| Transport and activity | Rebuild buses, cars, cyclists, walkers and train paths against the same network and actual levels | No routes through buildings/courts; bridges and tunnels correct; existing pause and visibility controls still work |
| Density and appearance | Apply the current facade/roof/court finishes to real footprints, with selective landmark models | Match reference districts without replacing footprints with generic terraces |
| Whole-city delivery | Package district tiles with spatial culling, caching, progressive loading and levels of detail | Test memory, frame time and hidden-view suspension on phones as well as desktop |
| Release | Change the public default after coverage and interaction checks | Directory, guide, availability, auth, saved conversations, quality and mobile controls pass regression checks |

This is a geography/rendering migration across several passes. The pilot proves
that real local density and placement can use the existing Three.js stack, with
no new dependency or paid map key. A whole-London view requires tiled loading;
a single large JSON/scene is not a suitable end state. Detailed historic facades
would need reference-led modelling after footprints and heights are resolved.

A streamed photogrammetric option is Google's Photorealistic 3D Tiles. That would
mean a different tile-loading/rendering integration, a Maps API key/account and
provider attribution/content-use requirements. It is an alternative product
choice to the editable, styled building-footprint approach, not required for
this pilot. No account, billing or production integration was changed.

## Sources and licences

- [OSM extract](https://api.openstreetmap.org/api/0.6/map?bbox=-0.129,51.543,-0.113,51.551), downloaded 27 October 2026.
- [OSM clock-tower footprint, way 37371124](https://www.openstreetmap.org/way/37371124).
- [Islington Council: Caledonian Park](https://www.islington.gov.uk/physical-activity-parks-and-trees/parks-and-green-space/your-local-parks/caledonian-park): tower height and setting.
- [Historic England: The Clock Tower, list entry 1298021](https://historicengland.org.uk/listing/the-list/list-entry/1298021?section=official-list-entry): Portland stone, five stages, belvedere, pyramidal slate roof; grid reference TQ 30203 84805.
- [OSM copyright and ODbL](https://www.openstreetmap.org/copyright): attribution and derivative-data terms apply to the committed extract. Preview attribution is visible and linked to these terms.
- [Environment Agency DSM, 1 m](https://www.data.gov.uk/dataset/cf3f1137-c12b-44a1-a835-e80fe4a60b92/lidar-composite-digital-surface-model-dsm-1m) and [DTM, 1 m](https://www.data.gov.uk/dataset/01b3ee39-da3f-47b6-83da-dc98e73a461f/lidar-composite-dtm-2022-1m): potential height/terrain enrichment under OGL; the composite includes older surveys, so metadata dates require inspection.
- [Google 3D Tiles renderer integration](https://developers.google.com/maps/documentation/tile/use-renderer) and [policies](https://developers.google.com/maps/documentation/tile/policies): optional streamed-photogrammetry path.
