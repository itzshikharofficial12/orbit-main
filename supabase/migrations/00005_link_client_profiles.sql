-- ==========================================================
-- Orbit by Celestia Studios — Client Profile Link & Auto-Sync
-- Migration: 00005_link_client_profiles.sql
-- ==========================================================

-- 1. Auto-link existing client profiles to their corresponding client record in public.clients
-- Matches by:
-- a) Email match: clients.primary_contact_email = profiles.email
-- b) Name match: LOWER(clients.name) = LOWER(profiles.first_name) or LOWER(clients.name) = LOWER(CONCAT(profiles.first_name, ' ', profiles.last_name))
-- c) metadata client_id if present in auth.users

UPDATE public.profiles p
SET client_id = c.id
FROM public.clients c
WHERE p.role = 'CLIENT'
  AND (p.client_id IS NULL OR p.client_id != c.id)
  AND (
    LOWER(TRIM(c.primary_contact_email)) = LOWER(TRIM(p.email))
    OR LOWER(TRIM(c.name)) = LOWER(TRIM(p.first_name))
    OR LOWER(TRIM(c.name)) = LOWER(TRIM(CONCAT(p.first_name, ' ', COALESCE(p.last_name, ''))))
  );

-- 2. Also check if auth.users has raw_user_meta_data->>'client_id'
UPDATE public.profiles p
SET client_id = (u.raw_user_meta_data->>'client_id')::uuid
FROM auth.users u
WHERE p.id = u.id
  AND p.role = 'CLIENT'
  AND p.client_id IS NULL
  AND (u.raw_user_meta_data->>'client_id') IS NOT NULL
  AND (u.raw_user_meta_data->>'client_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. Update the handle_new_user trigger to preserve and sync client_id
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
    ELSE 'CLIENT'::public.orbit_role
  END;

  -- Extract or lookup client_id for CLIENT users
  IF v_role = 'CLIENT' THEN
    -- Try direct metadata
    IF (new.raw_user_meta_data->>'client_id') IS NOT NULL AND (new.raw_user_meta_data->>'client_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_client_id := (new.raw_user_meta_data->>'client_id')::uuid;
    ELSE
      -- Lookup by email or name in public.clients
      SELECT id INTO v_client_id
      FROM public.clients
      WHERE LOWER(TRIM(primary_contact_email)) = LOWER(TRIM(new.email))
         OR LOWER(TRIM(name)) = LOWER(TRIM(v_first_name))
      LIMIT 1;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, role, client_id)
  VALUES (new.id, new.email, v_first_name, v_last_name, v_role, v_client_id)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    client_id = COALESCE(EXCLUDED.client_id, public.profiles.client_id),
    updated_at = timezone('utc'::text, now());

  RETURN new;
END;
$$;

-- 4. Verification Diagnostic Query Function for safe relationship inspection
CREATE OR REPLACE FUNCTION public.get_auth_relationship_diagnostics()
RETURNS TABLE (
  auth_user_id UUID,
  email TEXT,
  profile_first_name TEXT,
  profile_role public.orbit_role,
  profile_client_id UUID,
  client_name TEXT,
  project_id UUID,
  project_name TEXT,
  project_service public.service_type,
  project_status public.project_status
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT 
    p.id AS auth_user_id,
    p.email,
    p.first_name AS profile_first_name,
    p.role AS profile_role,
    p.client_id AS profile_client_id,
    c.name AS client_name,
    pr.id AS project_id,
    pr.name AS project_name,
    pr.service_type AS project_service,
    pr.status AS project_status
  FROM public.profiles p
  LEFT JOIN public.clients c ON c.id = p.client_id
  LEFT JOIN public.projects pr ON pr.client_id = c.id
  WHERE p.role = 'CLIENT';
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_relationship_diagnostics() TO authenticated;
