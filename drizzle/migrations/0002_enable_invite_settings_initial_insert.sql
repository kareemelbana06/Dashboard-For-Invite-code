GRANT SELECT ON public.invite_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.invite_settings TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.invite_settings FROM anon, PUBLIC;

ALTER TABLE public.invite_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read invite settings" ON public.invite_settings;
CREATE POLICY "Anyone can read invite settings"
  ON public.invite_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Only the owner can insert invite settings" ON public.invite_settings;
CREATE POLICY "Only the owner can insert invite settings"
  ON public.invite_settings FOR INSERT
  TO authenticated
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'kareemmelbana@gmail.com');

DROP POLICY IF EXISTS "Only the owner can update invite settings" ON public.invite_settings;
CREATE POLICY "Only the owner can update invite settings"
  ON public.invite_settings FOR UPDATE
  TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'kareemmelbana@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'kareemmelbana@gmail.com');
