-- ==========================================================
-- Orbit by Celestia Studios — Clients Module Foundation
-- Migration: 00002_clients_schema.sql
-- ==========================================================

-- 1. Create Client Status Enum
DO $$ BEGIN
  CREATE TYPE public.client_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status public.client_status NOT NULL DEFAULT 'ACTIVE',
  primary_contact_name TEXT NOT NULL,
  primary_contact_email TEXT NOT NULL,
  primary_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for search and status filtering
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);

-- 3. Link Profiles to Clients (for client portal access)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON public.profiles(client_id);

-- 4. Secure Helper to prevent recursive RLS evaluations
-- Hardened with empty search_path and fully-qualified table/function references
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$;

-- 5. Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Clients Table

-- Super Admin: Full Management Access (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Super Admins can manage all clients" ON public.clients;
CREATE POLICY "Super Admins can manage all clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Client Users: Read-only access to their own assigned client record
DROP POLICY IF EXISTS "Clients can view own client record" ON public.clients;
CREATE POLICY "Clients can view own client record"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT client_id FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- 7. Timestamp trigger for clients table
DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
