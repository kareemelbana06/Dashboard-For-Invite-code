CREATE TABLE public.site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  invite_url text NOT NULL DEFAULT 'https://www.uber.com/invite/',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read the invite link"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Only signed-in users can update the invite link"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO public.site_settings (id, invite_url) VALUES (1, 'https://www.uber.com/invite/');