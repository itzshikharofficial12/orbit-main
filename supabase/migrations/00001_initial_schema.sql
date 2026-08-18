-- ==========================================================
-- Orbit by Celestia Studios — Initial Database Foundation
-- Migration: 00001_initial_schema.sql
-- ==========================================================

-- 1. Create Role Enum or check constraint
DO $$ BEGIN
  CREATE TYPE public.orbit_role AS ENUM ('SUPER_ADMIN', 'CLIENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  role public.orbit_role NOT NULL DEFAULT 'CLIENT',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Super Admins can view all profiles
CREATE POLICY "Super Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Users can update their own first_name and last_name
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from elevating their own role via client update
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- 5. Trigger to automatically create profile on Supabase Auth signup
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
BEGIN
  -- Extract metadata or default
  v_first_name := COALESCE(
    new.raw_user_meta_data->>'first_name',
    SPLIT_PART(COALESCE(new.raw_user_meta_data->>'full_name', new.email), ' ', 1),
    'User'
  );
  
  v_last_name := COALESCE(
    new.raw_user_meta_data->>'last_name',
    NULLIF(SUBSTRING(new.raw_user_meta_data->>'full_name' FROM POSITION(' ' IN new.raw_user_meta_data->>'full_name') + 1), '')
  );

  v_role := CASE
    WHEN (new.raw_user_meta_data->>'role') = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'::public.orbit_role
    ELSE 'CLIENT'::public.orbit_role
  END;

  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (new.id, new.email, v_first_name, v_last_name, v_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());

  RETURN new;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
