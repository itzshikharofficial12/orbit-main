import type {
  BillingPlan as SupabaseBillingPlan,
  BillingPlanInsert,
  BillingPlanUpdate,
  BillingScheduleItem as SupabaseBillingScheduleItem,
  BillingScheduleItemInsert,
  BillingScheduleItemUpdate,
  Payment as SupabasePayment,
  PaymentInsert,
  PaymentUpdate,
  BillingType,
  BillingPlanStatus,
  BillingScheduleStatus,
  PaymentMethod,
  PaymentStatus,
  Client,
  Project,
  Milestone,
  Profile,
} from "@/lib/supabase/types";

export type BillingPlan = SupabaseBillingPlan;
export type BillingScheduleItem = SupabaseBillingScheduleItem;
export type Payment = SupabasePayment;

export type {
  BillingPlanInsert,
  BillingPlanUpdate,
  BillingScheduleItemInsert,
  BillingScheduleItemUpdate,
  PaymentInsert,
  PaymentUpdate,
  BillingType,
  BillingPlanStatus,
  BillingScheduleStatus,
  PaymentMethod,
  PaymentStatus,
};

export interface BillingScheduleItemWithRelations extends BillingScheduleItem {
  milestone?: Pick<Milestone, "id" | "name" | "status"> | null;
  payments?: Payment[];
  paid_amount?: number;
  remaining_amount?: number;
  pending_verification_payment?: Payment | null;
  latest_rejected_payment?: Payment | null;
  is_under_verification?: boolean;
}

export interface BillingPlanWithRelations extends BillingPlan {
  client?: Pick<
    Client,
    "id" | "name" | "status" | "primary_contact_name" | "primary_contact_email"
  > | null;
  project?: Pick<Project, "id" | "name" | "status" | "service_type"> | null;
  created_by_profile?: Pick<
    Profile,
    "id" | "first_name" | "last_name" | "email"
  > | null;
  schedule_items?: BillingScheduleItemWithRelations[];
  total_collected?: number;
  total_outstanding?: number;
  next_due_date?: string | null;
  next_due_amount?: number | null;
}

export interface PaymentWithRelations extends Payment {
  client?: Pick<Client, "id" | "name"> | null;
  project?: Pick<Project, "id" | "name"> | null;
  schedule_item?: Pick<
    BillingScheduleItem,
    "id" | "title" | "amount" | "currency" | "due_date" | "billing_plan_id"
  > | null;
  verified_by_profile?: Pick<Profile, "id" | "first_name" | "last_name" | "email"> | null;
}

export interface PaymentOverviewMetrics {
  totalContractValue: number;
  collected: number;
  outstanding: number;
  overdue: number;
  dueThisMonth: number;
  upcoming: number;
  pendingVerificationCount: number;
  underVerificationAmount: number;
  currency: string;
}

export interface OverdueScheduleItem {
  id: string;
  title: string;
  amount: number;
  currency: string;
  due_date: string;
  daysOverdue: number;
  remainingAmount: number;
  paidAmount: number;
  status: BillingScheduleStatus;
  is_under_verification?: boolean;
  pending_verification_payment?: Payment | null;
  latest_rejected_payment?: Payment | null;
  client: {
    id: string;
    name: string;
    primary_contact_name?: string | null;
    primary_contact_email?: string | null;
  };
  project?: {
    id: string;
    name: string;
  } | null;
  billing_plan: {
    id: string;
    name: string;
    billing_type: BillingType;
  };
}

export interface UpcomingScheduleItem {
  id: string;
  title: string;
  amount: number;
  currency: string;
  due_date: string | null;
  remainingAmount: number;
  paidAmount: number;
  status: BillingScheduleStatus;
  is_under_verification?: boolean;
  pending_verification_payment?: Payment | null;
  latest_rejected_payment?: Payment | null;
  client: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  } | null;
  billing_plan: {
    id: string;
    name: string;
  };
}

export interface PendingBankTransfer {
  id: string;
  amount: number;
  currency: string;
  transaction_reference: string | null;
  paid_at: string | null;
  submitted_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  notes: string | null;
  status: PaymentStatus;
  client: {
    id: string;
    name: string;
    primary_contact_name?: string | null;
    primary_contact_email?: string | null;
    primary_contact_phone?: string | null;
  };
  project?: {
    id: string;
    name: string;
  } | null;
  schedule_item?: {
    id: string;
    title: string;
    amount: number;
    due_date: string | null;
    invoice_number?: string | null;
  } | null;
  billing_plan?: {
    id: string;
    name: string;
  } | null;
}

export interface BillingPlanFilterParams {
  clientId?: string;
  projectId?: string;
  billingType?: BillingType | "ALL";
  status?: BillingPlanStatus | "ALL";
  query?: string;
}

export interface PaymentActionResult {
  success: boolean;
  code?: string;
  plan?: BillingPlan;
  payment?: Payment;
  error?: string;
}

export interface InvoiceWithDetails {
  id: string;
  invoice_number: string;
  billing_plan_id: string;
  client_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  amount: number;
  tax_amount: number;
  currency: string;
  due_date: string | null;
  issue_date: string;
  sequence_number: number;
  status: BillingScheduleStatus;
  notes: string | null;
  terms: string | null;
  paid_amount: number;
  balance_due: number;
  client: {
    id: string;
    name: string;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
    primary_contact_phone: string | null;
  };
  project?: {
    id: string;
    name: string;
    service_type: string;
  } | null;
  billing_plan: {
    id: string;
    name: string;
    billing_type: BillingType;
    total_contract_value: number;
  };
  milestone?: {
    id: string;
    name: string;
    status: string;
  } | null;
  payments: PaymentWithRelations[];
  pending_verification_payment?: PaymentWithRelations | null;
  latest_rejected_payment?: PaymentWithRelations | null;
  is_under_verification?: boolean;
}

export interface ReceiptWithDetails {
  id: string;
  receipt_number: string;
  invoice_number: string | null;
  payment_date: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  transaction_reference: string | null;
  status: PaymentStatus;
  notes: string | null;
  client: {
    id: string;
    name: string;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
  };
  project?: {
    id: string;
    name: string;
    service_type: string;
  } | null;
  schedule_item?: {
    id: string;
    title: string;
    amount: number;
    invoice_number: string | null;
  } | null;
  verified_by_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

