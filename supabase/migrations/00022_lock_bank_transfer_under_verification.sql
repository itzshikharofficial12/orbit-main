-- ==========================================================
-- Orbit by Celestia Studios — Lock Bank Transfer Under Verification
-- Migration: 00022_lock_bank_transfer_under_verification.sql
-- ==========================================================

-- Enforce at the database level that at most ONE active pending verification payment
-- can exist for any billing schedule item at a time.
-- This prevents race conditions, simultaneous tab submissions, and duplicate API requests.

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_active_pending_verification
  ON public.payments(billing_schedule_item_id)
  WHERE billing_schedule_item_id IS NOT NULL
    AND status IN ('PENDING'::public.payment_status, 'PENDING_VERIFICATION'::public.payment_status);
