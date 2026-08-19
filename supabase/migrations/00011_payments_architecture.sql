-- ==========================================================
-- Orbit by Celestia Studios — Payments Module Architecture Revision
-- Migration: 00011_payments_architecture.sql
-- ==========================================================

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.billing_type AS ENUM (
    'ONE_TIME',
    'INSTALLMENTS',
    'RECURRING',
    'MILESTONE',
    'CUSTOM',
    'HYBRID'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_plan_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'COMPLETED',
    'PAUSED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_schedule_status AS ENUM (
    'SCHEDULED',
    'DUE',
    'PAID',
    'PARTIALLY_PAID',
    'OVERDUE',
    'CANCELLED',
    'WAIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'RAZORPAY',
    'BANK_TRANSFER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'PENDING_VERIFICATION',
    'PAID',
    'FAILED',
    'REFUNDED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Table: public.billing_plans
CREATE TABLE IF NOT EXISTS public.billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  billing_type public.billing_type NOT NULL,
  total_contract_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NULL,
  status public.billing_plan_status NOT NULL DEFAULT 'ACTIVE',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT check_billing_plan_total_positive CHECK (total_contract_value >= 0)
);

-- 3. Table: public.billing_schedule_items
CREATE TABLE IF NOT EXISTS public.billing_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_plan_id UUID NOT NULL REFERENCES public.billing_plans(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  due_date DATE NULL,
  scheduled_for DATE NULL,
  sequence_number INT NOT NULL DEFAULT 1,
  milestone_id UUID NULL REFERENCES public.milestones(id) ON DELETE SET NULL,
  recurrence_reference TEXT NULL,
  status public.billing_schedule_status NOT NULL DEFAULT 'SCHEDULED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT check_schedule_item_amount_positive CHECK (amount > 0)
);

-- 4. Table: public.payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_schedule_item_id UUID NULL REFERENCES public.billing_schedule_items(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  method public.payment_method NOT NULL DEFAULT 'BANK_TRANSFER',
  status public.payment_status NOT NULL DEFAULT 'PAID',
  transaction_reference TEXT NULL,
  razorpay_order_id TEXT NULL,
  razorpay_payment_id TEXT NULL,
  paid_at TIMESTAMPTZ NULL,
  verified_at TIMESTAMPTZ NULL,
  verified_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT check_payment_amount_positive CHECK (amount > 0)
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_billing_plans_client_id ON public.billing_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_plans_project_id ON public.billing_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_billing_plans_status ON public.billing_plans(status);
CREATE INDEX IF NOT EXISTS idx_billing_plans_created_at ON public.billing_plans(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_schedule_plan_id ON public.billing_schedule_items(billing_plan_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_client_id ON public.billing_schedule_items(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_project_id ON public.billing_schedule_items(project_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_milestone_id ON public.billing_schedule_items(milestone_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_status ON public.billing_schedule_items(status);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_due_date ON public.billing_schedule_items(due_date ASC);

CREATE INDEX IF NOT EXISTS idx_payments_schedule_id ON public.payments(billing_schedule_item_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON public.payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at DESC);

-- 6. Attach updated_at triggers
DROP TRIGGER IF EXISTS set_billing_plans_updated_at ON public.billing_plans;
CREATE TRIGGER set_billing_plans_updated_at
  BEFORE UPDATE ON public.billing_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_billing_schedule_updated_at ON public.billing_schedule_items;
CREATE TRIGGER set_billing_schedule_updated_at
  BEFORE UPDATE ON public.billing_schedule_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
-- Super Admin: Full CRUD access
DROP POLICY IF EXISTS "billing_plans_super_admin_all" ON public.billing_plans;
CREATE POLICY "billing_plans_super_admin_all"
  ON public.billing_plans
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "billing_schedule_items_super_admin_all" ON public.billing_schedule_items;
CREATE POLICY "billing_schedule_items_super_admin_all"
  ON public.billing_schedule_items
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "payments_super_admin_all" ON public.payments;
CREATE POLICY "payments_super_admin_all"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Client: SELECT only their own records
DROP POLICY IF EXISTS "billing_plans_client_select" ON public.billing_plans;
CREATE POLICY "billing_plans_client_select"
  ON public.billing_plans
  FOR SELECT
  TO authenticated
  USING (
    client_id = public.get_current_client_id()
  );

DROP POLICY IF EXISTS "billing_schedule_items_client_select" ON public.billing_schedule_items;
CREATE POLICY "billing_schedule_items_client_select"
  ON public.billing_schedule_items
  FOR SELECT
  TO authenticated
  USING (
    client_id = public.get_current_client_id()
  );

DROP POLICY IF EXISTS "payments_client_select" ON public.payments;
CREATE POLICY "payments_client_select"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    client_id = public.get_current_client_id()
  );
