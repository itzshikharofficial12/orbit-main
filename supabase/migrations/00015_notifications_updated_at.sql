-- ==========================================================
-- Orbit by Celestia Studios — Notifications Update Trigger Fix
-- Migration: 00015_notifications_updated_at.sql
-- ==========================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
  END IF;
END $$;
