ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS section text;

CREATE TABLE IF NOT EXISTS public.credential_settings (
  id boolean PRIMARY KEY DEFAULT true,
  domains text[] NOT NULL DEFAULT ARRAY['gmail.com'],
  default_domain text NOT NULL DEFAULT 'gmail.com',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credential_settings_singleton CHECK (id)
);

GRANT SELECT ON public.credential_settings TO authenticated;
GRANT ALL ON public.credential_settings TO service_role;

ALTER TABLE public.credential_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view credential settings" ON public.credential_settings;
CREATE POLICY "Staff can view credential settings"
  ON public.credential_settings FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

CREATE TRIGGER credential_settings_touch
  BEFORE UPDATE ON public.credential_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.credential_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;