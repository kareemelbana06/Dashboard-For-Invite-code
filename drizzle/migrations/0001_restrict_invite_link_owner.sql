DROP POLICY IF EXISTS "Only signed-in users can update the invite link" ON public.site_settings;
CREATE POLICY "Only the owner can update the invite link" ON public.site_settings
FOR UPDATE TO authenticated
USING (lower(auth.jwt() ->> 'email') = 'kareemmelbana@gmail.com')
WITH CHECK (lower(auth.jwt() ->> 'email') = 'kareemmelbana@gmail.com');