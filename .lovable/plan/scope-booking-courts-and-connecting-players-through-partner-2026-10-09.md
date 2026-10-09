# Scope: booking courts and connecting players through partner apps

## Goal
Let visitors book a court and find people to play with without leaving Islington Tennis, using LTA Play Tennis (ClubSpark), club booking systems (Better, Coolhurst's ClubSolution, Barbican on ClubSpark), SPIN and UTR, where those services allow it.

## What we already know (from earlier research in this project)
- **Better (Highbury Fields, Tennis Centre, Rosemary Gardens, Tufnell Park):** publishes a free open data feed of courts and time slots that anyone can read. That makes "show free court times" possible. Booking itself is not open: it needs Better's permission, a partner account and a test environment, and none of these exist yet.
- **LTA Play Tennis / ClubSpark:** has a public feed of courses and coaching sessions. The court finder is a website, not a public booking API. ClubSpark supports booking through partner websites, but only by arrangement.
- **Coolhurst (ClubSolution) and Barbican (ClubSpark):** members-only booking. No public way in. Links only.
- **SPIN and UTR:** not yet researched in this project. UTR has a partner API for ratings and player search, available on application. SPIN's public API access is unconfirmed.

## Proposed phases

### Phase 1 – Research and outreach (no code)
1. Check the current developer terms and access routes for UTR, SPIN, LTA/ClubSpark and Better Open Booking, and add the findings to the existing integration notes.
2. Draft short partnership enquiry emails for you to send (ClubSpark/LTA, Better/GLL, UTR, SPIN), asking about API access, a test environment, attribution, costs and booking permission. We send nothing without your go-ahead.

### Phase 2 – Live free court times (possible now, no permission needed)
- A background job reads Better's open feed every few minutes and stores upcoming tennis slots per court, mapped carefully to each venue.
- The court booking page shows "Free times today/tomorrow" with the time last checked, and a "Book on Better" button that goes to the right official page.
- The Ask guide can answer "Is there a court free at Highbury at 6pm?" using this data, always pointing to Better to book.
- If the data is old or missing, the page says so and never claims a court is free.

### Phase 3 – Connect with players
- Optional sign-in (email and Google) so players can create a simple profile: level, usual courts, times available, and an optional UTR rating they enter themselves.
- Extend "Play together" so players can post "looking for a hitting partner" and message or reply in the app, with blocking and reporting.
- Later, if UTR grants access: "Connect UTR" to verify ratings and suggest matched partners. Same approach for SPIN if it offers an API.

### Phase 4 – In-app booking (only after a provider agrees)
- Built only against an approved partner API with a test environment: hold a slot, confirm the price, pay, receive confirmation and handle cancellations.
- Until then, booking stays as a clear handoff to the official site or app.

## What we will not do
- Embed Better or ClubSpark login or payment pages, or log in on visitors' behalf.
- Use hidden or undocumented booking endpoints.
- Show prices or free times that don't come from the official source.

## Technical details
- Phase 2: a scheduled backend function using RPDE paging with a stored cursor, handling updates and deletions; tables for courts, slots and import status; CC-BY attribution to Better.
- Phase 3: profiles, posts and messages tables with row-level security; rate limiting and moderation on messages.
- Partner keys kept as backend secrets only.

## Questions for you
- Should Phase 2 (live free times) be built first while we wait to hear back from partners?
- Do you want player accounts (Phase 3), or keep the site sign-in free for now?
