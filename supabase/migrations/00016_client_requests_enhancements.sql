-- ==========================================================
-- Orbit by Celestia Studios — Client Requests & Support Module Enhancements
-- Migration: 00016_client_requests_enhancements.sql
-- ==========================================================

-- 1. Add WAITING_FOR_CLIENT to client_request_status enum if not present
DO $$ BEGIN
  ALTER TYPE public.client_request_status ADD VALUE IF NOT EXISTS 'WAITING_FOR_CLIENT';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Make project_id and deliverable_id NULLABLE in public.client_requests
DO $$ BEGIN
  ALTER TABLE public.client_requests ALTER COLUMN project_id DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.client_requests ALTER COLUMN deliverable_id DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN null;
END $$;

-- 3. Add new columns to public.client_requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'client_requests' AND column_name = 'reference_number'
  ) THEN
    ALTER TABLE public.client_requests ADD COLUMN reference_number TEXT NULL UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'client_requests' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.client_requests ADD COLUMN category TEXT NOT NULL DEFAULT 'GENERAL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'client_requests' AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE public.client_requests ADD COLUMN payment_id UUID NULL REFERENCES public.payments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'client_requests' AND column_name = 'meeting_id'
  ) THEN
    ALTER TABLE public.client_requests ADD COLUMN meeting_id UUID NULL REFERENCES public.meetings(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'client_requests' AND column_name = 'schedule_item_id'
  ) THEN
    ALTER TABLE public.client_requests ADD COLUMN schedule_item_id UUID NULL REFERENCES public.billing_schedule_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Create sequence and trigger for automated reference numbering (REQ-0001, REQ-0002...)
CREATE SEQUENCE IF NOT EXISTS public.client_request_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.set_request_reference_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := 'REQ-' || LPAD(nextval('public.client_request_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_request_reference ON public.client_requests;
CREATE TRIGGER trigger_set_request_reference
  BEFORE INSERT ON public.client_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_request_reference_number();

-- Backfill reference numbers for existing records that lack one
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.client_requests WHERE reference_number IS NULL ORDER BY created_at ASC LOOP
    UPDATE public.client_requests
    SET reference_number = 'REQ-' || LPAD(nextval('public.client_request_seq')::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- 5. Create Table: public.request_messages (Threaded support conversation)
CREATE TABLE IF NOT EXISTS public.request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.client_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_request_messages_request_id ON public.request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_request_messages_sender_id ON public.request_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_request_messages_created_at ON public.request_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_client_requests_reference_number ON public.client_requests(reference_number);
CREATE INDEX IF NOT EXISTS idx_client_requests_category ON public.client_requests(category);

-- 6. Enable RLS on public.request_messages
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

-- 7. Hardened RLS Policies for request_messages
-- Super Admin: Full CRUD
DROP POLICY IF EXISTS "request_messages_super_admin_all" ON public.request_messages;
CREATE POLICY "request_messages_super_admin_all"
  ON public.request_messages
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Client: SELECT messages for requests belonging to their client_id
DROP POLICY IF EXISTS "request_messages_client_select" ON public.request_messages;
CREATE POLICY "request_messages_client_select"
  ON public.request_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_requests cr
      WHERE cr.id = request_messages.request_id
        AND cr.client_id = public.get_current_client_id()
    )
  );

-- Client: INSERT messages into requests belonging to their client_id
DROP POLICY IF EXISTS "request_messages_client_insert" ON public.request_messages;
CREATE POLICY "request_messages_client_insert"
  ON public.request_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.client_requests cr
      WHERE cr.id = request_messages.request_id
        AND cr.client_id = public.get_current_client_id()
    )
  );

-- 8. Update client_requests UPDATE policy to allow client to reopen or update their own requests
DROP POLICY IF EXISTS "client_requests_client_update" ON public.client_requests;
CREATE POLICY "client_requests_client_update"
  ON public.client_requests
  FOR UPDATE
  TO authenticated
  USING (
    client_id = public.get_current_client_id()
  )
  WITH CHECK (
    client_id = public.get_current_client_id()
  );
