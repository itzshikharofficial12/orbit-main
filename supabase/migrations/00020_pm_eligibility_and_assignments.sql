-- ==========================================================
-- Orbit by Celestia Studios — PM Eligibility & Assignments
-- Migration: 00020_pm_eligibility_and_assignments.sql
-- ==========================================================

-- 1. Extend public.profiles with is_project_manager boolean column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_project_manager BOOLEAN NOT NULL DEFAULT false;

-- Create index for PM eligibility lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_project_manager ON public.profiles(is_project_manager);

-- 2. Update handle_new_user trigger to support is_project_manager flag
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
  v_is_project_manager BOOLEAN;
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
  v_is_project_manager := COALESCE(
    (new.raw_user_meta_data->>'is_project_manager')::boolean,
    v_job_role = 'PROJECT_MANAGER',
    false
  );

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

  INSERT INTO public.profiles (id, email, first_name, last_name, role, client_id, job_role, status, phone, is_project_manager)
  VALUES (new.id, new.email, v_first_name, v_last_name, v_role, v_client_id, v_job_role, v_status, v_phone, v_is_project_manager)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    client_id = COALESCE(EXCLUDED.client_id, public.profiles.client_id),
    job_role = COALESCE(EXCLUDED.job_role, public.profiles.job_role),
    status = COALESCE(EXCLUDED.status, public.profiles.status),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    is_project_manager = COALESCE(EXCLUDED.is_project_manager, public.profiles.is_project_manager),
    updated_at = timezone('utc'::text, now());

  RETURN new;
END;
$$;

-- 3. Backfill is_project_manager for existing PMs and relevant team members
UPDATE public.profiles
SET is_project_manager = true
WHERE job_role = 'PROJECT_MANAGER'
   OR email IN (
     'shikhar@celestiastudios.in',
     'mehak.sharma@celestiastudios.in',
     'pushkar.gupta@celestiastudios.in'
   );

-- 4. Backfill clients.project_manager_id from notes if not set
UPDATE public.clients
SET project_manager_id = (
  substring(notes from '\[PM:\s*([0-9a-f-]{36})\]')::uuid
)
WHERE project_manager_id IS NULL
  AND notes ~* '\[PM:\s*[0-9a-f-]{36}\]';
