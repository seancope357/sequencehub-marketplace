-- Add upload_sessions for multipart uploads
-- Date: 2026-02-03

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE upload_status AS ENUM (
    'INITIATED',
    'UPLOADING',
    'ALL_CHUNKS_UPLOADED',
    'PROCESSING',
    'COMPLETED',
    'ABORTED',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.upload_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type file_type NOT NULL,
  mime_type TEXT NOT NULL,
  chunk_size INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  uploaded_chunks JSONB NOT NULL DEFAULT '[]'::jsonb,
  status upload_status NOT NULL DEFAULT 'INITIATED',
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  version_id UUID REFERENCES public.product_versions(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS upload_sessions_user_id_idx ON public.upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS upload_sessions_status_idx ON public.upload_sessions(status);
CREATE INDEX IF NOT EXISTS upload_sessions_expires_at_idx ON public.upload_sessions(expires_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own upload sessions" ON public.upload_sessions
  FOR SELECT USING (user_id = auth.uid() OR auth.has_role('ADMIN'));

CREATE POLICY "Users can create own upload sessions" ON public.upload_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.has_role('ADMIN'));

CREATE POLICY "Users can update own upload sessions" ON public.upload_sessions
  FOR UPDATE USING (user_id = auth.uid() OR auth.has_role('ADMIN'));

CREATE POLICY "Users can delete own upload sessions" ON public.upload_sessions
  FOR DELETE USING (user_id = auth.uid() OR auth.has_role('ADMIN'));
