-- ==========================================================
-- Orbit by Celestia Studios — Notifications Module
-- Migration: 00009_notifications_system.sql
-- ==========================================================

-- 1. Create or Recreate Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Safely migrate older column names if table already existed from previous draft
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_profile_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_id'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN recipient_profile_id TO recipient_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
  END IF;
END $$;

-- 2. Indexes for High-Performance Queries & Unread Feeds
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- 3. Attach updated_at trigger
DROP TRIGGER IF EXISTS set_notifications_updated_at ON public.notifications;
CREATE TRIGGER set_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Drop legacy policies on notifications
DROP POLICY IF EXISTS "notifications_super_admin_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_client_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_client_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_client_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_user_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_user_update" ON public.notifications;

-- 6. Hardened RLS Policies
-- Users can SELECT only their own notifications
CREATE POLICY "notifications_user_select"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    recipient_id = (SELECT auth.uid())
  );

-- Users can UPDATE (e.g. mark as read) only their own notifications
CREATE POLICY "notifications_user_update"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    recipient_id = (SELECT auth.uid())
  )
  WITH CHECK (
    recipient_id = (SELECT auth.uid())
  );

-- Super Admins can manage all notifications if required
CREATE POLICY "notifications_super_admin_all"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
