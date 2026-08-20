import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getClients } from "@/modules/clients/data";
import { getActiveProjectManagers } from "@/modules/team/data";
import { ClientList } from "@/modules/clients/components/client-list";
import { AddClientDialog } from "@/modules/clients/components/add-client-dialog";

export const metadata = {
  title: "Clients — Orbit",
  description: "Manage Celestia Studios clients and their active engagements.",
};

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/hq/clients");
  }

  if (profile.role === "CLIENT") {
    redirect("/client");
  }

  const [clients, projectManagers] = await Promise.all([
    getClients(),
    getActiveProjectManagers(),
  ]);

  return (
    <OrbitShell
      profile={profile}
      basePath="/hq"
      title="Clients"
      description="Manage Celestia Studios clients and their active engagements."
      actions={<AddClientDialog projectManagers={projectManagers} />}
    >
      <ClientList initialClients={clients} />
    </OrbitShell>
  );
}
