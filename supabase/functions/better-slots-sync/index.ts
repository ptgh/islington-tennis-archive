// Reads Better's OpenActive slot feed (CC-BY 4.0, attribution: Better) and keeps
// upcoming Islington tennis court times. Runs on a schedule; each run continues
// from the stored cursor so the harvest catches up over several runs.
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";

const FEED = "https://better-admin.org.uk/api/openactive/better/slots";
const STATE_ID = "better-slots";
const MAX_PAGES = 45;

// Individual courts from Better's facility-uses feed, mapped to this site's venues.
const COURTS: Record<string, { venue: string; name: string }> = {
  "86e1af2fb3001f82abda9a0685fe2cc7": { venue: "highbury-fields", name: "Court 1" },
  "d046b330682987ed6ded06872e8230e2": { venue: "highbury-fields", name: "Court 2" },
  "a2235d55c70eed4ea45c4786a263aa82": { venue: "highbury-fields", name: "Court 3" },
  "fc501e10910c1f5cd278318286df6c54": { venue: "highbury-fields", name: "Court 4" },
  "37fb9f512a4ac328f3e3bad3cb7d75a9": { venue: "highbury-fields", name: "Court 5" },
  "e316f72189e22b5742b942bf713ed32c": { venue: "highbury-fields", name: "Court 6" },
  "9c508c3658524b2b191f9e1725bc21e9": { venue: "highbury-fields", name: "Court 7" },
  "c0c5d376e999fb1d973d117aef5df15b": { venue: "highbury-fields", name: "Court 8" },
  "c7aa3ea98761b870a797a8a7eaba283c": { venue: "highbury-fields", name: "Court 9" },
  "9cabe30a57dcdb24cbd156d6a7746ef1": { venue: "highbury-fields", name: "Court 10" },
  "dd3d4e05bf29e6b4a2d52620a730878e": { venue: "highbury-fields", name: "Court 11" },
  "34327e776eac1ee5a504dab4dbc12a63": { venue: "islington-tennis-centre", name: "Indoor Court 1" },
  "00336596fe4c8d5a33d29b987e0b9cf7": { venue: "islington-tennis-centre", name: "Indoor Court 2" },
  "fb043e708269e868b03ad86286d3a8bb": { venue: "islington-tennis-centre", name: "Indoor Court 3" },
  "b489830435363bba63fefe8770cb97ef": { venue: "islington-tennis-centre", name: "Indoor Court 4" },
  "6e76ac3823896cc03f2d77c9f7c90846": { venue: "islington-tennis-centre", name: "Indoor Court 5" },
  "2907cbed8543c884fb5ec44f6f8c166a": { venue: "islington-tennis-centre", name: "Indoor Court 6" },
  "e2476f72c390ae1692f749cb62ff7e2a": { venue: "islington-tennis-centre", name: "Outdoor Court 1" },
  "2ce1a1841c73ddb10ca9833bee74809f": { venue: "islington-tennis-centre", name: "Outdoor Court 2" },
};

type Item = { state: string; id: string; data?: { startDate?: string; endDate?: string; facilityUse?: string; remainingUses?: number; maximumUses?: number; offers?: { price?: number }[] } };

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const trusted = authenticateCronRequest(req) === null;
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: state } = await db.from("feed_state").select("*").eq("id", STATE_ID).maybeSingle();
  // The schedule calls with the public key, so throttle: public data, at most one run per 4 minutes.
  if (!trusted && state?.last_success && Date.now() - Date.parse(state.last_success) < 4 * 60_000) {
    return Response.json({ skipped: true });
  }
  // First run starts 45 days back: enough to cover slots Better publishes ahead.
  let url: string = state?.next_url ?? `${FEED}?afterTimestamp=${Math.floor(Date.now() / 1000) - 45 * 86400}&afterId=activity%3A0`;
  let caughtUp = false, pages = 0, kept = 0;
  try {
    while (pages < MAX_PAGES) {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`Feed returned ${res.status}`);
      const page = await res.json() as { items: Item[]; next: string };
      pages++;
      const upserts = [], deletes: string[] = [];
      const now = Date.now();
      for (const item of page.items) {
        const hash = item.data?.facilityUse?.split("/").pop() ?? "";
        const court = COURTS[hash];
        if (item.state === "deleted" || !item.data) { deletes.push(item.id); continue; }
        if (!court || !item.data.startDate || !item.data.endDate) continue;
        if (Date.parse(item.data.endDate) < now) { deletes.push(item.id); continue; }
        upserts.push({ id: item.id, venue_id: court.venue, court_name: court.name, start_at: item.data.startDate, end_at: item.data.endDate, remaining_uses: item.data.remainingUses ?? 0, maximum_uses: item.data.maximumUses ?? 1, price: item.data.offers?.[0]?.price ?? null, updated_at: new Date().toISOString() });
      }
      if (upserts.length) { const { error } = await db.from("court_slots").upsert(upserts); if (error) throw error; kept += upserts.length; }
      if (deletes.length) await db.from("court_slots").delete().in("id", deletes);
      if (page.next) url = page.next;
      if (page.items.length === 0) { caughtUp = true; break; }
    }
    await db.from("court_slots").delete().lt("end_at", new Date().toISOString());
    await db.from("feed_state").upsert({ id: STATE_ID, next_url: url, caught_up: caughtUp || !!state?.caught_up, last_success: new Date().toISOString(), last_error: null });
    return Response.json({ pages, kept, caughtUp });
  } catch (e) {
    await db.from("feed_state").upsert({ id: STATE_ID, next_url: url, caught_up: !!state?.caught_up, last_error: String(e).slice(0, 300) });
    return Response.json({ error: "Sync failed" }, { status: 502 });
  }
});
