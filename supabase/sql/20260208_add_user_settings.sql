-- SequenceHUB: User settings storage (non-destructive)
-- Date: 2026-02-08

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT,
  support_email TEXT,
  notification_email TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency TEXT NOT NULL DEFAULT 'USD',
  dashboard_default_view TEXT NOT NULL DEFAULT 'overview',
  products_page_size INTEGER NOT NULL DEFAULT 25,
  theme_preference TEXT NOT NULL DEFAULT 'system',
  notify_new_order BOOLEAN NOT NULL DEFAULT true,
  notify_payouts BOOLEAN NOT NULL DEFAULT true,
  notify_comments BOOLEAN NOT NULL DEFAULT false,
  notify_system BOOLEAN NOT NULL DEFAULT true,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_settings_currency_check
    CHECK (currency IN ('USD', 'CAD', 'EUR', 'GBP')),
  CONSTRAINT user_settings_dashboard_default_view_check
    CHECK (dashboard_default_view IN ('overview', 'listings', 'orders', 'payouts', 'support')),
  CONSTRAINT user_settings_products_page_size_check
    CHECK (products_page_size IN (10, 25, 50, 100)),
  CONSTRAINT user_settings_theme_preference_check
    CHECK (theme_preference IN ('system', 'light', 'dark'))
);

CREATE INDEX IF NOT EXISTS user_settings_updated_at_idx
  ON public.user_settings (updated_at DESC);

CREATE OR REPLACE FUNCTION public.set_user_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER set_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_user_settings_updated_at();

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own settings" ON public.user_settings;
CREATE POLICY "Users can read own settings"
  ON public.user_settings
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
  ON public.user_settings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage user settings" ON public.user_settings;
CREATE POLICY "Service role can manage user settings"
  ON public.user_settings
  FOR ALL
  USING (auth.role() = 'service_role');
