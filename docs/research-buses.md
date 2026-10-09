# Bus route snapshot

Checked 21 September 2026 against the live TfL route pages and TfL Unified API. The app includes three useful corridors, not a complete local bus network.

| Route | Published full corridor | Useful local stops | Official route |
| --- | --- | --- | --- |
| 19 | Finsbury Park Interchange to Parkgate Road, Battersea Bridge | Highbury Barn; Highbury Grove School / Aberdeen Park; Highbury Corner; Angel Station; Sadler’s Wells Theatre | [TfL route 19](https://tfl.gov.uk/bus/route/19/) |
| 30 | Euston Station to Hackney Wick / Trowbridge Road | King’s Cross Station; Angel Station; Highbury Corner; Highbury Grove; Mildmay Park / Southgate Road | [TfL route 30](https://tfl.gov.uk/bus/route/30/) |
| 43 | Halliwick Park, Friern Barnet, to London Bridge Bus Station | Archway; Upper Holloway; Holloway Road Station; Highbury & Islington Station; Angel Station; Old Street Station | [TfL route 43](https://tfl.gov.uk/bus/route/43/) |

## Geometry and scope

`src/data/busRoutes.ts` holds a static snapshot of **outbound** routes, using official stop coordinates for route 19 and route geometry for routes 30/43, from:

- [TfL API: route 19](https://api.tfl.gov.uk/Line/19/Route/Sequence/outbound)
- [TfL API: route 30](https://api.tfl.gov.uk/Line/30/Route/Sequence/outbound)
- [TfL API: route 43](https://api.tfl.gov.uk/Line/43/Route/Sequence/outbound)

For routes 30/43, the API’s longitude/latitude paths were clipped to a local bounding box (longitude −0.16 to −0.07, latitude 51.515 to 51.59), adjacent repeated points removed, then simplified with a 12-metre Douglas–Peucker tolerance. These retain 21 and 41 vertices. Route 43 returned three variants; only the first full route variant was selected. Alternative paths were **not** concatenated. The displayed stop names are a selection checked against each API response, not every stop.

### Route 19 geometry discrepancy and correction

A second direct API check on 21 September 2026 found an upstream variant mismatch, rather than an extraction error. `/Line/19/Route/Sequence/outbound` returned one 247-point `lineStrings[0]` path travelling west via Isledon Road, Sobell Centre and Holloway Road. Its western point `[-0.116924, 51.556135]` is present in the raw response. The apparently long diagonal towards Highbury Corner in the simplified path follows that western corridor; it was not a fabricated join between separate lines.

However, `stopPointSequences[0].stopPoint` and `orderedLineRoutes[0]` list the eastern route through Highbury Barn, matching the [public TfL route 19 page](https://tfl.gov.uk/bus/route/19/). A second `orderedLineRoutes` entry lists Rock Street, Isledon Road, Berriman Road, Sobell Centre, Holloway Road and Highbury & Islington instead. Those alternative stop names and positions were independently resolved through the official `/StopPoint/{id}` endpoint; for example [Sobell Centre, 490008368S](https://api.tfl.gov.uk/StopPoint/490008368S), at `[-0.11191, 51.55799]`, and [Holloway Road / Camden Road, 490008296N](https://api.tfl.gov.uk/StopPoint/490008296N), at `[-0.11532, 51.55682]`. They align with the returned geometry. Thus the original app combined the primary stop list with another variant's shape.

The [route 19 disruption endpoint](https://api.tfl.gov.uk/Line/19/Disruption) returned an empty list at the check. This is insufficient to establish whether the other variant is stale, a diversion, or a valid alternate operating pattern, so no such claim is made.

Route 19 now uses the **25 primary stop coordinates** inside the same neighbourhood bounds, in their published order, with no invented road bends and no mix of variants. Its description explicitly calls this a schematic. Examples are Finsbury Park Interchange `[-0.10569, 51.56469]`, Highbury Barn `[-0.09832, 51.55286]`, Highbury Grove School / Aberdeen Park `[-0.09811, 51.55079]`, Highbury Corner `[-0.10153, 51.54611]`, and Angel Station `[-0.10546, 51.53374]`. It conveys the verified eastern corridor but is not a road-level driving trace. Routes 30 and 43 were left byte-for-byte unchanged during this correction.

Animations are illustrative motion on a geographic route snapshot, not live vehicle positions, timetables, journey durations or arrival predictions. The surrounding town remains illustrative. A route may continue beyond the visible segment. The route page links are the source for current travel information. Recheck this snapshot before publication or after route changes.

TfL’s [19/38 restructure consultation](https://haveyoursay.tfl.gov.uk/bus-routes-19-38) discusses rerouting route 19 towards Victoria. The route page and API queried for this snapshot still returned the Battersea corridor. No future proposal was substituted into the operating geometry. Route 30’s queried endpoint was Euston, not the older Marble Arch endpoint.

Powered by TfL Open Data. Contains OS data © Crown copyright and database rights 2016. Geomni UK Map data © and database rights [2019]. The attribution statements should also appear in the app’s source information. See [TfL’s transport data terms](https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service). This independent guide is not endorsed by TfL.
