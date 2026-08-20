-- Migration: 00014_payments_client_rls.sql
-- Description: Grant authenticated client users permission to insert payment records for their client_id.

DROP POLICY IF EXISTS "payments_client_insert" ON public.payments;

CREATE POLICY "payments_client_insert"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = public.get_current_client_id()
  );
