-- ==========================================================
-- Orbit by Celestia Studios — Project Management Module
-- Migration: 00003_projects_schema.sql
-- ==========================================================

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.service_type AS ENUM (
    'BRAND_FOUNDATION',
    'SAAS_WEBSITE',
    'GROWTH_ENGINE',
    'AI_OPERATIONS'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM (
    'PLANNING',
    'ACTIVE',
    'ON_HOLD',
    'IN_REVIEW',
    'COMPLETED',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.milestone_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM (
    'TODO',
    'IN_PROGRESS',
    'REVIEW',
    'COMPLETED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service_type public.service_type NOT NULL,
  description TEXT,
  status public.project_status NOT NULL DEFAULT 'PLANNING',
  start_date DATE,
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_project_dates CHECK (target_date IS NULL OR start_date IS NULL OR target_date >= start_date)
);

-- Indexes on projects
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_service_type ON public.projects(service_type);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- 3. Create Milestones Table
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status public.milestone_status NOT NULL DEFAULT 'NOT_STARTED',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on milestones
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON public.milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_position ON public.milestones(project_id, position ASC);

-- 4. Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'TODO',
  priority public.task_priority NOT NULL DEFAULT 'MEDIUM',
  due_date DATE,
  client_visible BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON public.tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON public.tasks(milestone_id, position ASC);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Projects
DROP POLICY IF EXISTS "Super Admins can manage all projects" ON public.projects;
CREATE POLICY "Super Admins can manage all projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Clients can view own projects" ON public.projects;
CREATE POLICY "Clients can view own projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    client_id = (
      SELECT client_id FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- 7. RLS Policies for Milestones
DROP POLICY IF EXISTS "Super Admins can manage all milestones" ON public.milestones;
CREATE POLICY "Super Admins can manage all milestones"
  ON public.milestones
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Clients can view own milestones" ON public.milestones;
CREATE POLICY "Clients can view own milestones"
  ON public.milestones
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = (
        SELECT client_id FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  );

-- 8. RLS Policies for Tasks
DROP POLICY IF EXISTS "Super Admins can manage all tasks" ON public.tasks;
CREATE POLICY "Super Admins can manage all tasks"
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Clients can view own visible tasks" ON public.tasks;
CREATE POLICY "Clients can view own visible tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    client_visible = true AND
    milestone_id IN (
      SELECT m.id FROM public.milestones m
      JOIN public.projects p ON p.id = m.project_id
      WHERE p.client_id = (
        SELECT client_id FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  );

-- 9. Updated_at Triggers
DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_milestones_updated_at ON public.milestones;
CREATE TRIGGER set_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
