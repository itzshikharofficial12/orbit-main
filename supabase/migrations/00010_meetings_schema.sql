-- ==========================================================
-- Orbit by Celestia Studios — Meetings Module
-- Migration: 00010_meetings_schema.sql
-- ==========================================================

-- 1. Create Enum for Meeting Status
DO $$ BEGIN
  CREATE TYPE public.meeting_status AS ENUM (
    'SCHEDULED',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Table: public.meetings
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  meeting_url TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status public.meeting_status NOT NULL DEFAULT 'SCHEDULED',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  cancelled_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  CONSTRAINT check_meetings_ends_after_starts CHECK (ends_at > starts_at)
);

-- 3. Indexes for Optimized Lookups, Calendars & Range Queries
CREATE INDEX IF NOT EXISTS idx_meetings_client_id ON public.meetings(client_id);
CREATE INDEX IF NOT EXISTS idx_meetings_project_id ON public.meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_starts_at ON public.meetings(starts_at);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON public.meetings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_upcoming ON public.meetings(client_id, status, starts_at ASC);

-- 4. Attach updated_at trigger
DROP TRIGGER IF EXISTS set_meetings_updated_at ON public.meetings;
CREATE TRIGGER set_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Enable Row Level Security
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Super Admin: Full CRUD access
DROP POLICY IF EXISTS "meetings_super_admin_all" ON public.meetings;
CREATE POLICY "meetings_super_admin_all"
  ON public.meetings
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Client: SELECT only meetings belonging to their own client
DROP POLICY IF EXISTS "meetings_client_select" ON public.meetings;
CREATE POLICY "meetings_client_select"
  ON public.meetings
  FOR SELECT
  TO authenticated
  USING (
    client_id = public.get_current_client_id()
  );
