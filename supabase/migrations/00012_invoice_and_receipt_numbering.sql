-- ==========================================================
-- Orbit by Celestia Studios — Invoice & Receipt Numbering
-- Migration: 00012_invoice_and_receipt_numbering.sql
-- ==========================================================

-- 1. Sequences for Invoice and Receipt Numbering
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START WITH 1001;

-- 2. Add Columns to billing_schedule_items
ALTER TABLE public.billing_schedule_items
  ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS terms TEXT;

-- 3. Add Columns to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE;

-- 4. Generator Functions
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  seq_val BIGINT;
  new_invoice_num TEXT;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  seq_val := nextval('public.invoice_number_seq');
  new_invoice_num := 'CS-' || current_year || '-' || LPAD(seq_val::text, 4, '0');
  RETURN new_invoice_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  seq_val BIGINT;
  new_receipt_num TEXT;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  seq_val := nextval('public.receipt_number_seq');
  new_receipt_num := 'CS-RCP-' || current_year || '-' || LPAD(seq_val::text, 4, '0');
  RETURN new_receipt_num;
END;
$$;

-- 5. Triggers for Auto Number Generation on Insert
CREATE OR REPLACE FUNCTION public.set_invoice_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := public.generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_invoice_number ON public.billing_schedule_items;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON public.billing_schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_invoice_number_trigger();

CREATE OR REPLACE FUNCTION public.set_receipt_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := public.generate_receipt_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_receipt_number ON public.payments;
CREATE TRIGGER trigger_set_receipt_number
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_receipt_number_trigger();

-- 6. Backfill existing schedule items without an invoice number
DO $$
DECLARE
  r RECORD;
  current_year TEXT;
  seq_val BIGINT;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  FOR r IN SELECT id FROM public.billing_schedule_items WHERE invoice_number IS NULL ORDER BY created_at ASC LOOP
    seq_val := nextval('public.invoice_number_seq');
    UPDATE public.billing_schedule_items
    SET invoice_number = 'CS-' || current_year || '-' || LPAD(seq_val::text, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- 7. Backfill existing payments without a receipt number
DO $$
DECLARE
  r RECORD;
  current_year TEXT;
  seq_val BIGINT;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  FOR r IN SELECT id FROM public.payments WHERE receipt_number IS NULL ORDER BY created_at ASC LOOP
    seq_val := nextval('public.receipt_number_seq');
    UPDATE public.payments
    SET receipt_number = 'CS-RCP-' || current_year || '-' || LPAD(seq_val::text, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- 8. Index on Invoice Number and Receipt Number
CREATE INDEX IF NOT EXISTS idx_billing_schedule_invoice_number ON public.billing_schedule_items(invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON public.payments(receipt_number);
