DO $$
BEGIN
  CREATE TYPE public.support_ticket_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status public.support_ticket_status NOT NULL DEFAULT 'OPEN',
  order_id UUID,
  product_id UUID,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS support_tickets_seller_id_status_idx
  ON public.support_tickets (seller_id, status);

CREATE INDEX IF NOT EXISTS support_tickets_order_id_idx
  ON public.support_tickets (order_id);

CREATE INDEX IF NOT EXISTS support_tickets_product_id_idx
  ON public.support_tickets (product_id);

CREATE INDEX IF NOT EXISTS support_tickets_created_at_idx
  ON public.support_tickets (created_at);

CREATE OR REPLACE FUNCTION public.set_support_tickets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_support_tickets_updated_at ON public.support_tickets;

CREATE TRIGGER set_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_support_tickets_updated_at();
