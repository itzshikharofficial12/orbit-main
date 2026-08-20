-- ==============================================================================
-- MIGRATION 00013: RAZORPAY SCHEMA ENHANCEMENTS & WEBHOOK IDEMPOTENCY
-- ==============================================================================

-- 1. Add signature field to payments table if not present
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_signature TEXT NULL;

-- 2. Create unique partial index on razorpay_payment_id to enforce idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id 
ON public.payments(razorpay_payment_id) 
WHERE razorpay_payment_id IS NOT NULL;

-- 3. Create index on razorpay_order_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id 
ON public.payments(razorpay_order_id) 
WHERE razorpay_order_id IS NOT NULL;

-- 4. Table: public.razorpay_webhook_events (Deduplication ledger)
CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_event_id 
ON public.razorpay_webhook_events(event_id);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_processed_at 
ON public.razorpay_webhook_events(processed_at DESC);

-- 5. Enable Row Level Security on webhook events table
ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Super admins can view webhook events" ON public.razorpay_webhook_events;
CREATE POLICY "Super admins can view webhook events"
  ON public.razorpay_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Service role can manage webhook events" ON public.razorpay_webhook_events;
CREATE POLICY "Service role can manage webhook events"
  ON public.razorpay_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
