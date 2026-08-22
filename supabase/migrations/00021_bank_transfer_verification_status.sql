-- ==========================================================
-- Orbit by Celestia Studios — Bank Transfer Verification Status
-- Migration: 00021_bank_transfer_verification_status.sql
-- ==========================================================

-- 1. Add verification and rejection audit columns to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;

-- 2. Backfill submitted_at for existing payments from created_at
UPDATE public.payments
SET submitted_at = created_at
WHERE submitted_at IS NULL;

-- 3. Create high-performance lookup indexes
CREATE INDEX IF NOT EXISTS idx_payments_status_method ON public.payments(status, method);
CREATE INDEX IF NOT EXISTS idx_payments_schedule_status ON public.payments(billing_schedule_item_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_submitted_at ON public.payments(submitted_at DESC);

-- 4. Ensure RLS policies on payments table
-- Authenticated clients can only insert payments for their own client_id with PENDING_VERIFICATION status
DROP POLICY IF EXISTS "payments_client_insert" ON public.payments;
CREATE POLICY "payments_client_insert"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = public.get_current_client_id()
    AND status = 'PENDING_VERIFICATION'::public.payment_status
  );
