# Tennis data and booking: verified integration route

Checked 25 September 2026. No booking calls made; no credentials, payments or new third-party wiring added.

## What is available

Better publishes an OpenActive dataset at https://better-admin.org.uk/api/openactive/better with facility uses, individual courts, sessions and slots. Its licence is CC-BY 4.0 with attribution to Better. Documentation describes near-real-time updates. Public feed reads succeeded without a key:

- https://better-admin.org.uk/api/openactive/better/facility-uses
- https://better-admin.org.uk/api/openactive/better/slots

A facility record returned `activity_recurrence_group:2050`, “Tennis Court (Floodlit)”, associated with Islington Tennis Centre and Gym. Its official booking URL is https://bookings.better.org.uk/location/islington-tennis-centre/tennis-court-outdoor . Individual resources include Outdoor Court 1, Outdoor Court 2 **and Highbury Fields Tennis Court 7**. This grouping means venue-level location alone is insufficient: map each individual court to the correct venue before exposing results.

Each inspected feed returned 500 records and a `next` cursor. The first slots included 2022 dates. This is an incremental dataset, not a “give me today's tennis” endpoint. Never render the first feed page as current availability or interpret an incomplete harvest as no courts available.

The LTA publishes participation-course data at https://api.clubspark.uk/odi/public/courses, documented at https://github.com/LawnTennisAssociation/opendata . This covers participation campaigns; it is not evidence of complete court inventory or a general-purpose booking API. Endpoint contents were not verified in this pass.

## Recommended next implementation

1. A server-side RPDE importer with durable cursor/state, updates and deletions, attribution and last-success timestamps. Finish the initial import before labelling coverage complete.
2. Normalize individual courts against the curated venue IDs; manually review the Highbury/ITC split and unmapped records. Scope display to tennis, not every Better activity.
3. Filter future slots, capacity, permitted offers and cancellation status. Show retrieval time and stale/unavailable states. Never invent prices or available times.
4. Present a tennis-first drawer: venue → date → duration → court/time/price → official booking handoff. Keep access restrictions and membership pricing visible. Use verified provider URLs rather than invented date parameters.
5. Add direct checkout only after provider-supported broker access and a sandbox are available; implement reservations, expiry, price revalidation, cancellations and payment confirmation against that API. Keep credentials server-side.

## In-site booking blocker

Better's dataset page contains an Open Booking section, but its Access/Documentation/Base URI fields did not establish a usable public booking integration. The OpenActive booking specification requires API permission/key and a broker relationship; open data is not permission to reserve courts. Obtain operator confirmation of supported booking API/widget, sandbox, terms, credentials, payment handling and cancellation flow. No supported Better checkout embed was verified. Do not iframe a login/payment page or automate customers' accounts as a substitute.

Sources:
- Better dataset: https://better-admin.org.uk/api/openactive/better
- Open Booking specification: https://openactive.io/open-booking-api/
- Better customer booking flow: https://www.better.org.uk/booking
- Clubspark describes third-party booking support, but does not establish access for this app: https://clubspark.com/

Product priority: tennis discovery, community and trustworthy planning information. Booking remains with the operator. API research is an assessment, not authorisation to add checkout.

## LTA / ClubSpark review — 27 September 2026

**Conclusion:** data enrichment is feasible; supported direct booking access for this independent site is not established. No accounts were created, messages sent, bookings attempted or API wiring added.

| Capability | Evidence inspected | Decision for this site |
| --- | --- | --- |
| LTA court discovery | The [court finder](https://www.lta.org.uk/play/book-a-tennis-court/) accepts location, date and time. [LTA's venue guidance](https://www.lta.org.uk/roles-and-venues/parks-support-toolkit/court-course-bookings/) says the service draws venue, court and course information from ClubSpark. | Useful official destination, but its website is not a documented public API contract. |
| Course/session enrichment | [LTA's own open-data repository](https://github.com/LawnTennisAssociation/opendata) documents the [public courses feed](https://api.clubspark.uk/odi/public/courses). A read returned JSON SessionSeries with location, level, age range, offers, scheduled sessions and provider links. | A viable research source for coaching and programmes. It is explicitly participation-campaign data, not comprehensive court inventory. |
| Feed freshness | The inspected course response included sessions dated 2023 and 2024. The documentation's original publication is 2017. | Do not treat a successful request as current local coverage. Complete RPDE synchronisation, process deletions, validate dates and reconcile providers before showing results. Islington coverage was not established in this review. |
| Court availability | [Better's dataset page](https://better-admin.org.uk/api/openactive/better) publishes FacilityUse/Slot feeds, describes near-real-time updates and a CC-BY 4.0 licence. This was rechecked today; the individual-court examples above are the 25 September observations. | The more concrete route for Better-operated Islington courts. A complete importer and court-level mapping remain necessary. No current free slots are claimed. |
| Direct booking | [ClubSpark](https://clubspark.com/en-us) describes bookings through third-party websites. The inspected public LTA/ClubSpark pages did not supply independent-developer court-booking endpoints, credential onboarding or a sandbox. Better's Open Booking section still has no usable access/documentation/base-URI detail. | Technically plausible through a provider-supported relationship; access for this app remains unconfirmed. Do not substitute undocumented browser endpoints or customer-account automation. |

The [OpenActive specifications](https://developer.openactive.io/publishing-data/data-feeds) distinguish listing feeds from bookable feeds: publishing open opportunity data does not by itself enable reservations. Tennis Australia's [official ClubSpark guidance](https://www.tennis.com.au/clubs-coaches-officials/apps/using-clubspark) demonstrates an OpenActive court-availability integration in another deployment; this does not establish access to the UK LTA dataset.

Recommended next step: start with a read-only, provider-attributed session/availability assessment, keeping official booking links. Before any ClubSpark integration, ask [ClubSpark](https://clubspark.com/en-us/contact) and LTA whether they support an independent Islington discovery app, which UK feeds cover the target venues, and what partner access, usage limits, attribution and caching rules apply. Request booking documentation and a sandbox only if direct booking becomes a deliberate product decision. No enquiry has been sent.
