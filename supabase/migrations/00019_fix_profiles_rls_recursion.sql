-- ==========================================================
-- Orbit by Celestia Studios — Fix Profiles RLS Recursion
-- Migration: 00019_fix_profiles_rls_recursion.sql
-- ==========================================================

-- 1. Create a safe, hardened SECURITY DEFINER helper to get assigned PM
CREATE OR REPLACE FUNCTION public.get_assigned_pm_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_pm_id uuid;
BEGIN
  SELECT c.project_manager_id INTO v_pm_id
  FROM public.clients c
  JOIN public.profiles p ON p.client_id = c.id
  WHERE p.id = (SELECT auth.uid())
    AND c.project_manager_id IS NOT NULL
  LIMIT 1;

  RETURN v_pm_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assigned_pm_id() TO authenticated;

-- 2. Clean up and replace circular/recursive policies on public.profiles
DO $$ BEGIN
  DROP POLICY IF EXISTS "Clients can view their assigned PM profile" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_client_view_pm" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
END $$;

-- Re-create clean, non-recursive policies on public.profiles
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
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "profiles_client_view_pm"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = public.get_assigned_pm_id());

-- 3. Fix client_pm_history policies to use is_super_admin() instead of direct profile subquery
DO $$ BEGIN
  DROP POLICY IF EXISTS "Super Admins can view client_pm_history" ON public.client_pm_history;
  DROP POLICY IF EXISTS "Super Admins can insert client_pm_history" ON public.client_pm_history;
  DROP POLICY IF EXISTS "client_pm_history_admin_select" ON public.client_pm_history;
  DROP POLICY IF EXISTS "client_pm_history_admin_insert" ON public.client_pm_history;
END $$;

CREATE POLICY "client_pm_history_admin_select"
  ON public.client_pm_history
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "client_pm_history_admin_insert"
  ON public.client_pm_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());
