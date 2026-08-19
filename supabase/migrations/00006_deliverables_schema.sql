-- ==========================================================
-- Orbit by Celestia Studios — Deliverables Module
-- Migration: 00006_deliverables_schema.sql
-- ==========================================================

-- 1. Create Deliverable Status Enum
DO $$ BEGIN
  CREATE TYPE public.deliverable_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'READY',
    'DELIVERED',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Deliverables Table
CREATE TABLE IF NOT EXISTS public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID NULL REFERENCES public.milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.deliverable_status NOT NULL DEFAULT 'PENDING',
  delivery_date DATE,
  url TEXT,
  client_visible BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indexes on Deliverables
CREATE INDEX IF NOT EXISTS idx_deliverables_project_id ON public.deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_milestone_id ON public.deliverables(milestone_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON public.deliverables(status);
CREATE INDEX IF NOT EXISTS idx_deliverables_client_visible ON public.deliverables(client_visible);
CREATE INDEX IF NOT EXISTS idx_deliverables_delivery_date ON public.deliverables(delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliverables_created_at ON public.deliverables(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliverables_position ON public.deliverables(project_id, position ASC);

-- 4. Attach set_updated_at trigger
DROP TRIGGER IF EXISTS set_deliverables_updated_at ON public.deliverables;
CREATE TRIGGER set_deliverables_updated_at
  BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Enable RLS
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Super Admin: Full CRUD
DROP POLICY IF EXISTS "deliverables_super_admin_all" ON public.deliverables;
CREATE POLICY "deliverables_super_admin_all"
  ON public.deliverables
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Client: SELECT ONLY for client-visible deliverables on their assigned projects
DROP POLICY IF EXISTS "deliverables_client_select" ON public.deliverables;
CREATE POLICY "deliverables_client_select"
  ON public.deliverables
  FOR SELECT
  TO authenticated
  USING (
    client_visible = true AND
    project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.get_current_client_id()
    )
  );
