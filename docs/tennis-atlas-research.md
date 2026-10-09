# Tennis atlas: sources and maintenance

Research checked 3 October 2026; interface verification completed 28 September 2026.

The atlas is an optional layer over the existing Islington experience. Wimbledon and Queen’s are separate London destinations, not additions to the local playable-court count. Closing it preserves the current local view; Back to Islington restores the home view. The club miniatures and London layout are original illustrations, not surveyed site plans or travel routes.

## Clubs and the LTA

- **Wimbledon / All England Lawn Tennis Club:** [official museum and tours](https://www.wimbledon.com/en_GB/museum_and_tours), [visitor directions](https://www.wimbledon.com/en_GB/visit/getting_here.html). The visitor offering is museum/tours, not general court access.
- **The Queen’s Club:** [official club information](https://www.queensclub.co.uk/About_the_Club), [membership](https://www.queensclub.co.uk/About_the_Club/Membership), [public-facing shop](https://www.queensclub.co.uk/Shop), [location](https://www.queensclub.co.uk/about_the_club/location). A private members’ club; spectator access depends on the event.
- The About dialog and atlas link to [LTA ways to play](https://www.lta.org.uk/play/) and the [LTA event calendar](https://www.lta.org.uk/fan-zone/event-calendar/). The site remains an independent guide with no claimed LTA affiliation.

## Tournament records

| Edition | Dates displayed | Basis |
| --- | --- | --- |
| WTA Finals 2026, Indian Wells | 8–15 November 2026 | [Current official WTA event FAQ](https://www.wtatennis.com/news/4525612/wtatenniscomwtafinals-faq), also [event schedule](https://www.wtatennis.com/tournaments/wta-finals/match-schedule). The updated FAQ takes precedence over an older WTA PDF listing Riyadh. |
| Nitto ATP Finals 2026, Turin | 15–22 November 2026 | [Official tournament site](https://www.nittoatpfinals.com/en/). |
| Davis Cup Final 8 2026, Bologna | 24–29 November 2026 | [LTA calendar](https://www.lta.org.uk/fan-zone/event-calendar/) and [Davis Cup information](https://www.lta.org.uk/fan-zone/davis-cup/). |
| Australian Open 2027, Melbourne | Main draw 17–31 January 2027 | [LTA Australian Open guide](https://www.lta.org.uk/fan-zone/grand-slam/australian-open/); qualifying/opening week 11–16 January is distinguished in the note. |
| Roland-Garros 2027, Paris | Main draw 23 May–6 June 2027 | [LTA Roland-Garros guide](https://www.lta.org.uk/fan-zone/grand-slam/roland-garros/); qualifying 17–21 May is separate. |
| HSBC Championships 2027, Queen’s | **Provisional calendar window** 5–20 June 2027 | The [LTA calendar](https://www.lta.org.uk/fan-zone/event-calendar/) still marks its overall window provisional. The LTA’s [residents’ information](https://www.lta.org.uk/fan-zone/international/hsbc-championships/residents-information/) now specifies qualifying from 5 June, women’s week 7–13 June and men’s week 14–20 June. |
| The Championships, Wimbledon 2027 | 28 June–11 July 2027 | [LTA calendar](https://www.lta.org.uk/fan-zone/event-calendar/), with an [official Wimbledon handoff](https://www.wimbledon.com/). |
| US Open 2027, New York | **Dates to be confirmed** | The LTA calendar combined a 2026 event title with a 2027 date range, while its detail page still described 2026. No date was imported from that conflicting listing. The watchlist links to the [official US Open](https://www.usopen.org/). |

This is a curated local catalogue in `src/data/tennisAtlas.ts`, not a live feed or exhaustive tour database. Records carry an edition, source, status, venue, coordinates and optional date range. Coordinates position tournament destinations on the atlas; they are not entrance directions. There is no booking integration, account, API key or external database.

The UI uses the London calendar date, refreshed by the app’s existing minute clock. Dated events remain visible through their final day and then leave the upcoming view. Undated editions expire at year-end. Date comparisons are day-level discovery guidance, not live play/session status at venues in other timezones. Provisional events never receive a confirmed countdown. New editions and source changes require an editorial update; the source check date is shown in the calendar.

To maintain: review the official event pages, update the typed records and `ATLAS_CHECKED`, preserve uncertainty where necessary, then run `npm test` and `npm run build`. Add new countries to the Europe grouping if expanding beyond the present UK, France and Italy events.

## Geography asset

`public/atlas-world.svg` is a simplified equirectangular drawing of [Natural Earth 110m land](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson), excluding Antarctica. Natural Earth data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). The asset is bundled locally, with a visible source link. It does not require a map API or tracking service. The closer Europe view separates crowded destinations with leader lines to their map positions.

## Verification and limits

Automated tests cover London date rollover, inclusive end dates, removal of completed editions, filtering, club/event links, uncertain-date wording, valid date ranges and source identities. Browser checks cover both club destinations, world/Europe views, calendar selection, Grand Slam filtering, unconfirmed-date display, keyboard dismissal/focus return, home return, mobile layout and readable About credits.

The local calendar needs future editorial updates. Miniatures are intentionally stylised. No photographic asset, new dependency, auth/persistence, booking, payment or third-party API wiring was introduced.
