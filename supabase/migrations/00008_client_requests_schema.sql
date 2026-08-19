-- ==========================================================
-- Orbit by Celestia Studios — Client Change Requests Module
-- Migration: 00008_client_requests_schema.sql
-- ==========================================================

-- 1. Create Enums for Client Request Status and Priority
DO $$ BEGIN
  CREATE TYPE public.client_request_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.client_request_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Table: public.client_requests
CREATE TABLE IF NOT EXISTS public.client_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES public.deliverables(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status public.client_request_status NOT NULL DEFAULT 'OPEN',
  priority public.client_request_priority NOT NULL DEFAULT 'MEDIUM',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3. Indexes for Optimized Lookups & Filtering
CREATE INDEX IF NOT EXISTS idx_client_requests_client_id ON public.client_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_client_requests_project_id ON public.client_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_client_requests_deliverable_id ON public.client_requests(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_client_requests_status ON public.client_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_requests_priority ON public.client_requests(priority);
CREATE INDEX IF NOT EXISTS idx_client_requests_created_by ON public.client_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_client_requests_created_at ON public.client_requests(created_at DESC);

-- 4. Attach updated_at trigger
DROP TRIGGER IF EXISTS set_client_requests_updated_at ON public.client_requests;
CREATE TRIGGER set_client_requests_updated_at
  BEFORE UPDATE ON public.client_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Enable Row Level Security
ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Super Admin: Full CRUD
DROP POLICY IF EXISTS "client_requests_super_admin_all" ON public.client_requests;
CREATE POLICY "client_requests_super_admin_all"
  ON public.client_requests
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Client: SELECT only requests belonging to their own client
DROP POLICY IF EXISTS "client_requests_client_select" ON public.client_requests;
CREATE POLICY "client_requests_client_select"
  ON public.client_requests
  FOR SELECT
  TO authenticated
  USING (
    client_id = public.get_current_client_id()
  );

-- Client: INSERT requests only for their own client account
DROP POLICY IF EXISTS "client_requests_client_insert" ON public.client_requests;
CREATE POLICY "client_requests_client_insert"
  ON public.client_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = public.get_current_client_id() AND
    created_by = auth.uid()
  );
