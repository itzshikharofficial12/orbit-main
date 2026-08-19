import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import {
  getBillingPlansForClient,
  getPaymentsForClient,
  getPaymentOverviewMetrics,
} from "@/modules/payments/data";
import { ClientPaymentsView } from "@/modules/payments/components/client-payments-view";

export const metadata = {
  title: "Payments — Orbit",
  description: "Billing schedules, invoices, and payment receipts.",
};

export const dynamic = "force-dynamic";

export default async function ClientPaymentsPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/client/payments");
  }

  if (profile.role === "SUPER_ADMIN") {
    redirect("/hq/payments");
  }

  const [plans, payments, metrics] = profile.client_id
    ? await Promise.all([
        getBillingPlansForClient(profile.client_id),
        getPaymentsForClient(profile.client_id),
        getPaymentOverviewMetrics(profile.client_id),
      ])
    : [[], [], { outstanding: 0, collected: 0, overdue: 0, upcoming: 0, currency: "INR" }];

  return (
    <OrbitShell
      profile={profile}
      basePath="/client"
      title="Payments"
      description="View expected billing schedules, remaining balances, and verified receipts."
    >
      <ClientPaymentsView
        plans={plans}
        payments={payments}
        metrics={metrics}
      />
    </OrbitShell>
  );
}
