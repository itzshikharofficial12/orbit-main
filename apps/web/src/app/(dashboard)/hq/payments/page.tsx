import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import {
  getBillingPlansForAdmin,
  getPaymentsForAdmin,
  getPaymentOverviewMetrics,
  getPendingBankTransfers,
  getOverdueScheduleItems,
  getUpcomingScheduleItems,
} from "@/modules/payments/data";
import { getClients } from "@/modules/clients/data";
import { getProjects } from "@/modules/projects/data";
import { AdminPaymentsDirectory } from "@/modules/payments/components/admin-payments-directory";

export const metadata = {
  title: "Payments — Orbit",
  description: "Commercial billing plans and revenue collection.",
};

export const dynamic = "force-dynamic";

export default async function HqPaymentsPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/hq/payments");
  }

  if (profile.role !== "SUPER_ADMIN") {
    redirect("/client");
  }

  const [plans, payments, metrics, pendingTransfers, overdueItems, upcomingItems, clients, projects] = await Promise.all([
    getBillingPlansForAdmin(),
    getPaymentsForAdmin(),
    getPaymentOverviewMetrics(),
    getPendingBankTransfers(),
    getOverdueScheduleItems(),
    getUpcomingScheduleItems(),
    getClients(),
    getProjects(),
  ]);

  return (
    <OrbitShell
      profile={profile}
      basePath="/hq"
      title="Payments"
      description="Manage billing, invoices, collections and outstanding payments."
    >
      <AdminPaymentsDirectory
        initialPlans={plans}
        initialPayments={payments}
        metrics={metrics}
        pendingTransfers={pendingTransfers}
        overdueItems={overdueItems}
        upcomingItems={upcomingItems}
        clients={clients}
        projects={projects}
      />
    </OrbitShell>
  );
}
