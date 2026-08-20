-- ==========================================================
-- Orbit by Celestia Studios — Team Directory & Client PM Structure
-- Migration: 00017_team_directory_and_client_pm.sql
-- ==========================================================

-- 1. Safely add 'EMPLOYEE' value to public.orbit_role enum if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE pg_type.typname = 'orbit_role'
      AND pg_enum.enumlabel = 'EMPLOYEE'
  ) THEN
    ALTER TYPE public.orbit_role ADD VALUE 'EMPLOYEE';
  END IF;
END $$;

-- 2. Extend public.profiles with job_role, status, and phone
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_role TEXT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT NULL;

-- Create index for employee queries
CREATE INDEX IF NOT EXISTS idx_profiles_job_role ON public.profiles(job_role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 3. Extend public.clients with primary project_manager_id
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS project_manager_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_project_manager_id ON public.clients(project_manager_id);

-- 4. Create public.client_pm_history table for assignment audits
CREATE TABLE IF NOT EXISTS public.client_pm_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  previous_pm_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  new_pm_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  note TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_pm_history_client ON public.client_pm_history(client_id);
CREATE INDEX IF NOT EXISTS idx_client_pm_history_changed_at ON public.client_pm_history(changed_at DESC);

-- 5. Enable RLS on client_pm_history
ALTER TABLE public.client_pm_history ENABLE ROW LEVEL SECURITY;

-- Super Admins can manage client_pm_history
DO $$ BEGIN
  DROP POLICY IF EXISTS "Super Admins can view client_pm_history" ON public.client_pm_history;
  CREATE POLICY "Super Admins can view client_pm_history"
    ON public.client_pm_history
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
      )
    );

  DROP POLICY IF EXISTS "Super Admins can insert client_pm_history" ON public.client_pm_history;
  CREATE POLICY "Super Admins can insert client_pm_history"
    ON public.client_pm_history
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
      )
    );
END $$;

-- 6. Add RLS policy for clients to view their assigned Project Manager profile
DO $$ BEGIN
  DROP POLICY IF EXISTS "Clients can view their assigned PM profile" ON public.profiles;
  CREATE POLICY "Clients can view their assigned PM profile"
    ON public.profiles
    FOR SELECT
    USING (
      id IN (
        SELECT project_manager_id
        FROM public.clients c
        JOIN public.profiles p ON p.client_id = c.id
        WHERE p.id = auth.uid()
          AND c.project_manager_id IS NOT NULL
      )
    );
END $$;

-- 7. Update handle_new_user trigger to support EMPLOYEE role and metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_role public.orbit_role;
  v_client_id UUID;
  v_job_role TEXT;
  v_status TEXT;
  v_phone TEXT;
BEGIN
  -- Extract names
  v_first_name := COALESCE(
    new.raw_user_meta_data->>'first_name',
    SPLIT_PART(COALESCE(new.raw_user_meta_data->>'full_name', new.email), ' ', 1),
    'User'
  );
  
  v_last_name := COALESCE(
    new.raw_user_meta_data->>'last_name',
    NULLIF(SUBSTRING(new.raw_user_meta_data->>'full_name' FROM POSITION(' ' IN new.raw_user_meta_data->>'full_name') + 1), '')
  );

  -- Extract role
  v_role := CASE
    WHEN (new.raw_user_meta_data->>'role') = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'::public.orbit_role
    WHEN (new.raw_user_meta_data->>'role') = 'EMPLOYEE' THEN 'EMPLOYEE'::public.orbit_role
    ELSE 'CLIENT'::public.orbit_role
  END;

  v_job_role := new.raw_user_meta_data->>'job_role';
  v_status := COALESCE(new.raw_user_meta_data->>'status', 'ACTIVE');
  v_phone := new.raw_user_meta_data->>'phone';

  -- Extract or lookup client_id for CLIENT users
  IF v_role = 'CLIENT' THEN
    IF (new.raw_user_meta_data->>'client_id') IS NOT NULL AND (new.raw_user_meta_data->>'client_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_client_id := (new.raw_user_meta_data->>'client_id')::uuid;
    ELSE
      SELECT id INTO v_client_id
      FROM public.clients
      WHERE LOWER(TRIM(primary_contact_email)) = LOWER(TRIM(new.email))
         OR LOWER(TRIM(name)) = LOWER(TRIM(v_first_name))
      LIMIT 1;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, role, client_id, job_role, status, phone)
  VALUES (new.id, new.email, v_first_name, v_last_name, v_role, v_client_id, v_job_role, v_status, v_phone)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    client_id = COALESCE(EXCLUDED.client_id, public.profiles.client_id),
    job_role = COALESCE(EXCLUDED.job_role, public.profiles.job_role),
    status = COALESCE(EXCLUDED.status, public.profiles.status),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = timezone('utc'::text, now());

  RETURN new;
END;
$$;
