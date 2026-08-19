import { notFound, redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getClientById, getClientPortalUsers } from "@/modules/clients/data";
import { getProjectsByClientId } from "@/modules/projects/data";
import { ClientDetailHeader } from "@/modules/clients/components/client-detail-header";
import { ClientOverviewTab } from "@/modules/clients/components/client-overview-tab";

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

  const [client, projects, portalUsers] = await Promise.all([
    getClientById(clientId),
    getProjectsByClientId(clientId),
    getClientPortalUsers(clientId),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <OrbitShell
      profile={profile}
      basePath="/hq"
      title={client.name}
      description="Client engagement workspace."
    >
      <div className="space-y-8">
        <ClientDetailHeader client={client} />
        <ClientOverviewTab
          client={client}
          projects={projects}
          portalUsers={portalUsers}
        />
      </div>
    </OrbitShell>
  );
}
