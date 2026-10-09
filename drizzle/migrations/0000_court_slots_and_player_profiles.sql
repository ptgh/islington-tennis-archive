CREATE TABLE public.court_slots (
  id text PRIMARY KEY,
  venue_id text NOT NULL,
  court_name text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  remaining_uses integer NOT NULL DEFAULT 0,
  maximum_uses integer NOT NULL DEFAULT 1,
  price numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX court_slots_venue_start ON public.court_slots (venue_id, start_at);
GRANT SELECT ON public.court_slots TO anon, authenticated;
GRANT ALL ON public.court_slots TO service_role;
ALTER TABLE public.court_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Court slots are public" ON public.court_slots FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.feed_state (
  id text PRIMARY KEY,
  next_url text,
  caught_up boolean NOT NULL DEFAULT false,
  last_success timestamptz,
  last_error text
);
GRANT SELECT ON public.feed_state TO anon, authenticated;
GRANT ALL ON public.feed_state TO service_role;
ALTER TABLE public.feed_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feed status is public" ON public.feed_state FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT 'Improver',
  utr_rating numeric(4,2),
  preferred_courts text[] NOT NULL DEFAULT '{}',
  contact text NOT NULL DEFAULT '',
  visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_name_len CHECK (char_length(display_name) <= 60),
  CONSTRAINT profiles_contact_len CHECK (char_length(contact) <= 120),
  CONSTRAINT profiles_utr_range CHECK (utr_rating IS NULL OR (utr_rating >= 1 AND utr_rating <= 16.5)),
  CONSTRAINT profiles_level CHECK (level IN ('Beginner','Improver','Intermediate','Advanced','Competitive'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players see listed profiles and their own" ON public.profiles FOR SELECT TO authenticated USING (visible OR id = auth.uid());
CREATE POLICY "Players create their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Players update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Players delete their own profile" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());

CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), 60))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();