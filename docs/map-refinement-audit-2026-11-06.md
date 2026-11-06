# Map refinement audit — 6 November 2026

## Delivered scope

- Destination arrival uses the containing recorded building or park polygon, including holes. A brief translucent fill settles to a thin perimeter; missing footprints do not get invented replacement geometry.
- Miniature cars, cyclists and motorbikes can follow consecutive, obstacle-checked vertices of the same source road. Junction gaps, ambiguous continuation and unsafe extensions retain the original safe stretch. Curves remain inside the source carriageway envelope; route construction is bounded to forty links in either direction.
- Pedal and wheel animation derives from actual accepted movement. Collision waits and pausing freeze these parts. Pedestrians pause between walks, and foxes dip to sniff while stopped. Streamed cells retain their existing actor budgets and ownership cleanup.
- Comparison opens the existing hours/prices/availability panel directly. Existing official operator links, feed freshness, booking behavior and browser-local comparison selections remain intact. Existing registered coaches are reachable from venue details.
- Shared close buttons have 44-pixel targets. Returning from booking restores heading focus, and quality controls restore focus without scrolling.

## Traffic source limits

The current cell importer exports road kind and vertices, but drops `oneway`, access restrictions and junction-control metadata. The new connected runs therefore stay on the same source way; they do not infer a new street turn, give-way priority or legal one-way direction. Existing collision reservation and endpoint signal/stop-line illustration remain in use. This is not a complete road-rules simulator.

A full junction-network phase needs a separately reviewed source import retaining direction/access tags and source traffic-control nodes, with provenance and geometry-orientation checks. It should then test directed junction transitions, turning envelopes, priorities, queues and streamed-boundary ownership before replacing the bounded current movement.

## Validation

- Geometry tests cover source footprint selection/holes, connected road continuity, obstacle fallback, curve bounds, car-body clearance and moving/paused cyclist parts.
- Desktop Chrome and mobile WebKit checks cover destination arrival, comparison → times/booking → venue details, existing coaching links, reduced motion, Battery saver and keyboard focus.
- Paused-scene instrumentation observes rendering after controls settle. Drawing buffers retain shared pixel budgets; no additional render pass, dependency, external texture or per-view exposure is introduced.
- Browser emulation does not establish frame-rate performance on a physical slower phone. Existing adaptive resolution remains responsible for that device-specific adjustment.
