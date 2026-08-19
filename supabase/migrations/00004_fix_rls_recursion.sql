-- ==========================================================
-- Orbit by Celestia Studios — Permanent RLS Recursion Fix & User Sync
-- Migration: 00004_fix_rls_recursion.sql
-- ==========================================================

-- 1. Dynamically drop ALL existing policies on relevant tables to guarantee a clean state
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'clients', 'projects', 'milestones', 'tasks')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 2. Backfill and sync profiles for any existing users in auth.users
INSERT INTO public.profiles (id, email, first_name, last_name, role)
SELECT 
  u.id,
  COALESCE(u.email, ''),
  COALESCE(
    u.raw_user_meta_data->>'first_name',
    SPLIT_PART(COALESCE(u.raw_user_meta_data->>'full_name', u.email), ' ', 1),
    'User'
  ),
  COALESCE(
    u.raw_user_meta_data->>'last_name',
    NULLIF(SUBSTRING(u.raw_user_meta_data->>'full_name' FROM POSITION(' ' IN u.raw_user_meta_data->>'full_name') + 1), '')
  ),
  CASE 
    WHEN (u.raw_user_meta_data->>'role') = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'::public.orbit_role 
    ELSE 'CLIENT'::public.orbit_role 
  END
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  updated_at = timezone('utc'::text, now());

-- 3. Create non-recursive, hardened SECURITY DEFINER authorization helpers
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_role public.orbit_role;
  v_jwt_role text;
BEGIN
  -- 1. Direct single-row lookup by auth.uid()
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = (SELECT auth.uid());
  
  IF v_role IS NOT NULL THEN
    RETURN v_role = 'SUPER_ADMIN';
  END IF;

  -- 2. Fallback to JWT metadata
  v_jwt_role := COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (auth.jwt() -> 'app_metadata' ->> 'role')
  );

  RETURN COALESCE(v_jwt_role = 'SUPER_ADMIN', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_client_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT client_id INTO v_client_id
  FROM public.profiles
  WHERE id = (SELECT auth.uid());
  
  RETURN v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_client_id() TO authenticated;

-- 4. POLICIES ON public.profiles
-- CRITICAL: profiles policies MUST NEVER call is_super_admin() to prevent circular recursion.

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_admin_all"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), (auth.jwt() -> 'app_metadata' ->> 'role')) = 'SUPER_ADMIN'
  )
  WITH CHECK (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), (auth.jwt() -> 'app_metadata' ->> 'role')) = 'SUPER_ADMIN'
  );

-- 5. POLICIES ON public.clients
CREATE POLICY "clients_super_admin_all"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "clients_client_select"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (id = public.get_current_client_id());

-- 6. POLICIES ON public.projects
CREATE POLICY "projects_super_admin_all"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "projects_client_select"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (client_id = public.get_current_client_id());

-- 7. POLICIES ON public.milestones
CREATE POLICY "milestones_super_admin_all"
  ON public.milestones
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "milestones_client_select"
  ON public.milestones
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.get_current_client_id()
    )
  );

-- 8. POLICIES ON public.tasks
CREATE POLICY "tasks_super_admin_all"
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "tasks_client_select"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    client_visible = true AND
    milestone_id IN (
      SELECT m.id FROM public.milestones m
      JOIN public.projects p ON p.id = m.project_id
      WHERE p.client_id = public.get_current_client_id()
    )
  );
