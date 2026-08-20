import { notFound, redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getClientById, getClientPortalUsers } from "@/modules/clients/data";
import { getProjectsByClientId } from "@/modules/projects/data";
import { getClientBillingOverview } from "@/modules/payments/data";
import { getActiveProjectManagers } from "@/modules/team/data";
import { ClientDetailHeader } from "@/modules/clients/components/client-detail-header";
import { ClientOverviewTab } from "@/modules/clients/components/client-overview-tab";
import { ClientPaymentsSection } from "@/modules/clients/components/client-payments-section";

interface ClientDetailPageProps {
  params: Promise<{ clientId: string }>;
}

export async function generateMetadata({ params }: ClientDetailPageProps) {
  const { clientId } = await params;
  const client = await getClientById(clientId);
  return {
    title: client ? `${client.name} — Clients | Orbit` : "Client Workspace — Orbit",
  };
}

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { clientId } = await params;
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect(`/login?redirect=/hq/clients/${clientId}`);
  }

  if (profile.role === "CLIENT") {
    redirect("/client");
  }

  const [client, projects, portalUsers, billingData, projectManagers] = await Promise.all([
    getClientById(clientId),
    getProjectsByClientId(clientId),
    getClientPortalUsers(clientId),
    getClientBillingOverview(clientId),
    getActiveProjectManagers(),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <OrbitShell
      profile={profile}
      basePath="/hq"
      hideHeader={true}
    >
      <div className="space-y-8">
        <ClientDetailHeader client={client} projectManagers={projectManagers} />
        <ClientOverviewTab
          client={client}
          projects={projects}
          portalUsers={portalUsers}
          projectManagers={projectManagers}
        />
        <div className="pt-4 border-t border-border/60">
          <ClientPaymentsSection
            client={client}
            projects={projects}
            plans={billingData.plans}
            payments={billingData.payments}
            metrics={billingData.metrics}
          />
        </div>
      </div>
    </OrbitShell>
  );
}
