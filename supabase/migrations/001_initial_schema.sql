-- SequenceHUB Supabase Migration
-- Initial Schema Creation with Row Level Security (RLS)
-- Date: 2026-01-31

-- ============================================
-- EXTENSIONS
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing (if needed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'CREATOR', 'BUYER');

CREATE TYPE onboarding_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'SUSPENDED'
);

CREATE TYPE product_status AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
  'SUSPENDED'
);

CREATE TYPE file_type AS ENUM (
  'SOURCE',      -- XSQ/XML project files
  'RENDERED',    -- FSEQ playback files
  'ASSET',       -- Images, audio, other assets
  'PREVIEW'      -- Video, GIF previews
);

CREATE TYPE product_category AS ENUM (
  'CHRISTMAS',
  'HALLOWEEN',
  'PIXEL_TREE',
  'MELODY',
  'MATRIX',
  'ARCH',
  'PROP',
  'FACEBOOK',
  'OTHER'
);

CREATE TYPE license_type AS ENUM (
  'PERSONAL',
  'COMMERCIAL'
);

CREATE TYPE checkout_status AS ENUM (
  'PENDING',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED'
);

CREATE TYPE order_status AS ENUM (
  'PENDING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED'
);

CREATE TYPE audit_action AS ENUM (
  'USER_LOGIN',
  'USER_LOGOUT',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'PRODUCT_CREATED',
  'PRODUCT_UPDATED',
  'PRODUCT_DELETED',
  'PRODUCT_PUBLISHED',
  'PRODUCT_UNPUBLISHED',
  'PRODUCT_ARCHIVED',
  'FILE_UPLOADED',
  'FILE_DELETED',
  'ORDER_CREATED',
  'ORDER_UPDATED',
  'ORDER_REFUNDED',
  'ENTITLEMENT_GRANTED',
  'ENTITLEMENT_REVOKED',
  'STRIPE_WEBHOOK_RECEIVED',
  'STRIPE_WEBHOOK_PROCESSED',
  'STRIPE_WEBHOOK_FAILED',
  'STRIPE_ONBOARDING_STARTED',
  'STRIPE_ACCOUNT_UPDATED',
  'STRIPE_CAPABILITY_UPDATED',
  'STRIPE_DASHBOARD_ACCESSED',
  'CHECKOUT_SESSION_CREATED',
  'PAYMENT_RECEIVED',
  'REFUND_INITIATED',
  'PAYOUT_CREATED',
  'ADMIN_ACTION',
  'RATE_LIMIT_EXCEEDED',
  'SECURITY_ALERT',
  'DOWNLOAD_TOKEN_CREATED',
  'DOWNLOAD_ACCESS_DENIED'
);

-- ============================================
-- USER MANAGEMENT TABLES
-- ============================================

-- Note: Supabase Auth manages auth.users table
-- We create a public users table for additional user data

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  website TEXT,
  social_twitter TEXT,
  social_youtube TEXT,
  social_instagram TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- ============================================
-- CREATOR & STRIPE CONNECT
-- ============================================

CREATE TABLE public.creator_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE,
  stripe_account_status TEXT,
  onboarding_status onboarding_status NOT NULL DEFAULT 'PENDING',
  platform_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_sales INTEGER NOT NULL DEFAULT 0,
  payout_schedule TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_creator_accounts_updated_at BEFORE UPDATE ON public.creator_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_creator_accounts_user_id ON public.creator_accounts(user_id);
CREATE INDEX idx_creator_accounts_stripe_account_id ON public.creator_accounts(stripe_account_id);

-- ============================================
-- PRODUCTS & VERSIONING
-- ============================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category product_category NOT NULL,
  status product_status NOT NULL DEFAULT 'DRAFT',
  license_type license_type NOT NULL DEFAULT 'PERSONAL',
  seat_count INTEGER,

  -- xLights-specific metadata
  xlights_version_min TEXT,
  xlights_version_max TEXT,
  target_use TEXT,
  expected_props TEXT,
  includes_fseq BOOLEAN NOT NULL DEFAULT false,
  includes_source BOOLEAN NOT NULL DEFAULT false,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,

  -- Stats
  view_count INTEGER NOT NULL DEFAULT 0,
  sale_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_products_creator_id ON public.products(creator_id);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_category ON public.products(category);

-- Product Versions
CREATE TABLE public.product_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_name TEXT NOT NULL,
  changelog TEXT,
  is_latest BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, version_number)
);

CREATE INDEX idx_product_versions_product_id ON public.product_versions(product_id);
CREATE INDEX idx_product_versions_is_latest ON public.product_versions(is_latest);

-- Product Files
CREATE TABLE public.product_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES public.product_versions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type file_type NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT,

  -- File metadata (extracted during analysis)
  metadata JSONB,

  -- xLights-specific metadata
  sequence_length NUMERIC(10,2),
  fps INTEGER,
  channel_count INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_files_version_id ON public.product_files(version_id);
CREATE INDEX idx_product_files_file_hash ON public.product_files(file_hash);

-- Product Media
CREATE TABLE public.product_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL, -- 'cover', 'gallery', 'preview'
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_media_product_id ON public.product_media(product_id);

-- Tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product Tags (Junction table)
CREATE TABLE public.product_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, tag_id)
);

CREATE INDEX idx_product_tags_product_id ON public.product_tags(product_id);
CREATE INDEX idx_product_tags_tag_id ON public.product_tags(tag_id);

-- ============================================
-- PRICING & PAYMENTS
-- ============================================

CREATE TABLE public.prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_prices_updated_at BEFORE UPDATE ON public.prices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_prices_product_id ON public.prices(product_id);

-- Checkout Sessions
CREATE TABLE public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL UNIQUE, -- Stripe checkout session ID
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  product_id UUID NOT NULL,
  price_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL,
  status checkout_status NOT NULL DEFAULT 'PENDING',
  success_url TEXT,
  cancel_url TEXT,
  metadata JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_checkout_sessions_updated_at BEFORE UPDATE ON public.checkout_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_checkout_sessions_session_id ON public.checkout_sessions(session_id);
CREATE INDEX idx_checkout_sessions_user_id ON public.checkout_sessions(user_id);
CREATE INDEX idx_checkout_sessions_product_id ON public.checkout_sessions(product_id);
CREATE INDEX idx_checkout_sessions_status ON public.checkout_sessions(status);

-- ============================================
-- ORDERS & ENTITLEMENTS
-- ============================================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status order_status NOT NULL DEFAULT 'PENDING',
  payment_intent_id TEXT UNIQUE,

  -- Refund tracking
  refunded_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  refunded_at TIMESTAMPTZ,

  -- UTM tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_payment_intent_id ON public.orders(payment_intent_id);

-- Order Items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version_id UUID,
  price_id UUID NOT NULL,
  price_at_purchase NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);

-- Entitlements
CREATE TABLE public.entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  version_id UUID NOT NULL,
  license_type license_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_download_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, version_id)
);

CREATE TRIGGER update_entitlements_updated_at BEFORE UPDATE ON public.entitlements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_entitlements_user_id ON public.entitlements(user_id);
CREATE INDEX idx_entitlements_order_id ON public.entitlements(order_id);
CREATE INDEX idx_entitlements_product_id ON public.entitlements(product_id);
CREATE INDEX idx_entitlements_is_active ON public.entitlements(is_active);

-- ============================================
-- DOWNLOADS & ACCESS CONTROL
-- ============================================

CREATE TABLE public.download_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entitlement_id UUID NOT NULL,
  file_id UUID,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_download_tokens_token ON public.download_tokens(token);
CREATE INDEX idx_download_tokens_user_id ON public.download_tokens(user_id);
CREATE INDEX idx_download_tokens_entitlement_id ON public.download_tokens(entitlement_id);
CREATE INDEX idx_download_tokens_expires_at ON public.download_tokens(expires_at);

-- Access Logs
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  entitlement_id UUID,
  file_id UUID,
  token TEXT,
  action TEXT NOT NULL, -- 'download_attempt', 'download_success', 'download_denied'
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX idx_access_logs_entitlement_id ON public.access_logs(entitlement_id);
CREATE INDEX idx_access_logs_ip_address ON public.access_logs(ip_address);
CREATE INDEX idx_access_logs_action ON public.access_logs(action);
CREATE INDEX idx_access_logs_created_at ON public.access_logs(created_at);

-- ============================================
-- AUDIT LOGS & SECURITY
-- ============================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  changes JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_order_id ON public.audit_logs(order_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type_id ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ============================================
-- MIGRATION SUPPORT TABLE
-- ============================================

-- User ID migrations (for mapping old CUIDs to new UUIDs)
CREATE TABLE public.user_id_migrations (
  old_user_id TEXT PRIMARY KEY,
  new_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_id_migrations_new_user_id ON public.user_id_migrations(new_user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION auth.has_role(role_name user_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users: Can read all, update own
CREATE POLICY "Users can read all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own record" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- Profiles: Can read all, update own
CREATE POLICY "Anyone can read profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR ALL USING (user_id = auth.uid());

-- User Roles: Can read own, admin can manage
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR auth.has_role('ADMIN'));

CREATE POLICY "Admin can manage roles" ON public.user_roles
  FOR ALL USING (auth.has_role('ADMIN'));

-- Creator Accounts: Can read/update own
CREATE POLICY "Users can read own creator account" ON public.creator_accounts
  FOR SELECT USING (user_id = auth.uid() OR auth.has_role('ADMIN'));

CREATE POLICY "Users can update own creator account" ON public.creator_accounts
  FOR ALL USING (user_id = auth.uid() OR auth.has_role('ADMIN'));

-- Products: All can read published, creators can CRUD own
CREATE POLICY "Anyone can read published products" ON public.products
  FOR SELECT USING (status = 'PUBLISHED' OR creator_id = auth.uid() OR auth.has_role('ADMIN'));

CREATE POLICY "Creators can insert products" ON public.products
  FOR INSERT WITH CHECK (auth.has_role('CREATOR') AND creator_id = auth.uid());

CREATE POLICY "Creators can update own products" ON public.products
  FOR UPDATE USING (creator_id = auth.uid() OR auth.has_role('ADMIN'));

CREATE POLICY "Creators can delete own products" ON public.products
  FOR DELETE USING (creator_id = auth.uid() OR auth.has_role('ADMIN'));

-- Product Versions: Inherit from products
CREATE POLICY "Users can read product versions" ON public.product_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_id
      AND (status = 'PUBLISHED' OR creator_id = auth.uid() OR auth.has_role('ADMIN'))
    )
  );

CREATE POLICY "Creators can manage product versions" ON public.product_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_id
      AND (creator_id = auth.uid() OR auth.has_role('ADMIN'))
    )
  );

-- Product Files: Only entitled users or creators can read
CREATE POLICY "Entitled users can read files" ON public.product_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.product_versions pv
      JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = version_id
      AND (
        p.creator_id = auth.uid() OR
        auth.has_role('ADMIN') OR
        EXISTS (
          SELECT 1 FROM public.entitlements e
          WHERE e.user_id = auth.uid()
          AND e.version_id = pv.id
          AND e.is_active = true
        )
      )
    )
  );

CREATE POLICY "Creators can manage product files" ON public.product_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.product_versions pv
      JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = version_id
      AND (p.creator_id = auth.uid() OR auth.has_role('ADMIN'))
    )
  );

-- Product Media: Public read, creator write
CREATE POLICY "Anyone can read product media" ON public.product_media
  FOR SELECT USING (true);

CREATE POLICY "Creators can manage product media" ON public.product_media
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_id
      AND (creator_id = auth.uid() OR auth.has_role('ADMIN'))
    )
  );

-- Tags: Public read, admin write
CREATE POLICY "Anyone can read tags" ON public.tags
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage tags" ON public.tags
  FOR ALL USING (auth.has_role('ADMIN'));

-- Product Tags: Creators can manage for own products
CREATE POLICY "Anyone can read product tags" ON public.product_tags
  FOR SELECT USING (true);

CREATE POLICY "Creators can manage product tags" ON public.product_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_id
      AND (creator_id = auth.uid() OR auth.has_role('ADMIN'))
    )
  );

-- Prices: Public read, creator write
CREATE POLICY "Anyone can read prices" ON public.prices
  FOR SELECT USING (true);

CREATE POLICY "Creators can manage prices" ON public.prices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_id
      AND (creator_id = auth.uid() OR auth.has_role('ADMIN'))
    )
  );

-- Checkout Sessions: Users read own, system writes
CREATE POLICY "Users can read own checkout sessions" ON public.checkout_sessions
  FOR SELECT USING (user_id = auth.uid() OR auth.has_role('ADMIN'));

-- System can insert checkout sessions (service role)
CREATE POLICY "Service role can manage checkout sessions" ON public.checkout_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Orders: Users read own, system writes
CREATE POLICY "Users can read own orders" ON public.orders
  FOR SELECT USING (user_id = auth.uid() OR auth.has_role('ADMIN'));

CREATE POLICY "Service role can manage orders" ON public.orders
  FOR ALL USING (auth.role() = 'service_role');

-- Order Items: Read via order ownership
CREATE POLICY "Users can read own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id
      AND (user_id = auth.uid() OR auth.has_role('ADMIN'))
    )
  );

CREATE POLICY "Service role can manage order items" ON public.order_items
  FOR ALL USING (auth.role() = 'service_role');

-- Entitlements: Users read own, system writes
CREATE POLICY "Users can read own entitlements" ON public.entitlements
  FOR SELECT USING (user_id = auth.uid() OR auth.has_role('ADMIN'));

CREATE POLICY "Service role can manage entitlements" ON public.entitlements
  FOR ALL USING (auth.role() = 'service_role');

-- Download Tokens: Users read own, system writes
CREATE POLICY "Users can read own download tokens" ON public.download_tokens
  FOR SELECT USING (user_id = auth.uid() OR auth.has_role('ADMIN'));

CREATE POLICY "Service role can manage download tokens" ON public.download_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Access Logs: Admin read, system write
CREATE POLICY "Admin can read access logs" ON public.access_logs
  FOR SELECT USING (auth.has_role('ADMIN'));

CREATE POLICY "Service role can write access logs" ON public.access_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Audit Logs: Admin read, system write
CREATE POLICY "Admin can read audit logs" ON public.audit_logs
  FOR SELECT USING (auth.has_role('ADMIN'));

CREATE POLICY "Service role can write audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, email, name, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar'
  );

  -- Insert default BUYER role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'BUYER');

  -- Create audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id)
  VALUES (NEW.id, 'USER_CREATED', 'user', NEW.id::text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE public.users IS 'Extended user information linked to Supabase Auth';
COMMENT ON TABLE public.profiles IS 'Public user profiles with social links';
COMMENT ON TABLE public.user_roles IS 'Role-based access control (RBAC)';
COMMENT ON TABLE public.creator_accounts IS 'Creator-specific data including Stripe Connect info';
COMMENT ON TABLE public.products IS 'xLights sequence products with versioning support';
COMMENT ON TABLE public.product_versions IS 'Version control for products';
COMMENT ON TABLE public.product_files IS 'FSEQ, XSQ, and asset files';
COMMENT ON TABLE public.product_media IS 'Product images and preview videos';
COMMENT ON TABLE public.entitlements IS 'Download permissions granted after purchase';
COMMENT ON TABLE public.audit_logs IS 'Comprehensive security and action logging';

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default tags
INSERT INTO public.tags (name, slug) VALUES
  ('Christmas', 'christmas'),
  ('Halloween', 'halloween'),
  ('Pixel Tree', 'pixel-tree'),
  ('Matrix', 'matrix'),
  ('Mega Tree', 'mega-tree'),
  ('House Outline', 'house-outline'),
  ('Singing Face', 'singing-face'),
  ('RGB', 'rgb'),
  ('Strobes', 'strobes'),
  ('Chases', 'chases');

-- Migration complete
SELECT 'Supabase schema migration completed successfully!' AS status;
