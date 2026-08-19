-- ==========================================================
-- Orbit by Celestia Studios — Deliverable Approval & Review Workflow
-- Migration: 00007_deliverable_approval_workflow.sql
-- ==========================================================

-- 1. Safely migrate deliverable_status enum without transaction lock errors
ALTER TABLE public.deliverables ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.deliverables ALTER COLUMN status TYPE text USING status::text;

-- Update legacy rows to new status terminology
UPDATE public.deliverables SET status = 'PLANNED' WHERE status = 'PENDING';
UPDATE public.deliverables SET status = 'READY_FOR_REVIEW' WHERE status = 'READY';
UPDATE public.deliverables SET status = 'APPROVED' WHERE status = 'DELIVERED';

-- Recreate enum cleanly with all workflow states
DROP TYPE IF EXISTS public.deliverable_status CASCADE;
CREATE TYPE public.deliverable_status AS ENUM (
  'PLANNED',
  'IN_PROGRESS',
  'READY_FOR_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'ARCHIVED'
);

-- Re-apply enum type to column
ALTER TABLE public.deliverables 
  ALTER COLUMN status TYPE public.deliverable_status USING status::public.deliverable_status;

ALTER TABLE public.deliverables 
  ALTER COLUMN status SET DEFAULT 'PLANNED'::public.deliverable_status;

-- 2. Rename delivery_date to expected_delivery_date safely
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'deliverables' AND column_name = 'delivery_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'deliverables' AND column_name = 'expected_delivery_date'
  ) THEN
    ALTER TABLE public.deliverables RENAME COLUMN delivery_date TO expected_delivery_date;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'deliverables' AND column_name = 'expected_delivery_date'
  ) THEN
    ALTER TABLE public.deliverables ADD COLUMN expected_delivery_date DATE;
  END IF;
END $$;

-- 3. Add approval workflow columns
ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS changes_requested_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS changes_requested_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_feedback TEXT NULL,
  ADD COLUMN IF NOT EXISTS submission_count INTEGER NOT NULL DEFAULT 0;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_deliverables_expected_delivery_date ON public.deliverables(expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliverables_approved_by ON public.deliverables(approved_by);
CREATE INDEX IF NOT EXISTS idx_deliverables_changes_requested_by ON public.deliverables(changes_requested_by);
CREATE INDEX IF NOT EXISTS idx_deliverables_submitted_at ON public.deliverables(submitted_at);

-- 5. Client UPDATE policy on deliverables (allows client to approve or request changes)
DROP POLICY IF EXISTS "deliverables_client_update" ON public.deliverables;
CREATE POLICY "deliverables_client_update" ON public.deliverables
  FOR UPDATE TO authenticated
  USING (
    client_visible = true AND
    project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.get_current_client_id()
    )
  )
  WITH CHECK (
    client_visible = true AND
    project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.get_current_client_id()
    )
  );

-- 6. Notifications Table & Infrastructure
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role public.orbit_role NULL,
  recipient_client_id UUID NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  recipient_profile_id UUID NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_client ON public.notifications(recipient_client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(recipient_profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON public.notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 7. Enable RLS on Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_super_admin_all" ON public.notifications;
CREATE POLICY "notifications_super_admin_all" ON public.notifications
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "notifications_client_select" ON public.notifications;
CREATE POLICY "notifications_client_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    recipient_client_id = public.get_current_client_id() OR
    recipient_profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "notifications_client_insert" ON public.notifications;
CREATE POLICY "notifications_client_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    recipient_role = 'SUPER_ADMIN' OR
    recipient_client_id = public.get_current_client_id() OR
    recipient_profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "notifications_client_update" ON public.notifications;
CREATE POLICY "notifications_client_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    recipient_client_id = public.get_current_client_id() OR
    recipient_profile_id = auth.uid()
  )
  WITH CHECK (
    recipient_client_id = public.get_current_client_id() OR
    recipient_profile_id = auth.uid()
  );
