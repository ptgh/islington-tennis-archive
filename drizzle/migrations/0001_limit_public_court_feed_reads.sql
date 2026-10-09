ALTER POLICY "Court slots are public" ON public.court_slots USING (venue_id IN ('highbury-fields', 'islington-tennis-centre') AND end_at > now());
ALTER POLICY "Feed status is public" ON public.feed_state USING (id = 'better-slots');
REVOKE SELECT ON public.feed_state FROM anon, authenticated;
GRANT SELECT (id, last_success, caught_up) ON public.feed_state TO anon, authenticated;
GRANT ALL ON public.feed_state TO service_role;
COMMENT ON TABLE public.court_slots IS 'Public Better OpenActive availability, limited to supported venues and upcoming slots.';
COMMENT ON TABLE public.feed_state IS 'Sync internals are service-only; visitors can read only the Better feed freshness fields.';