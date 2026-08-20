import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getClientRequestsForClient, getClientRequestStats } from "@/modules/requests/data";
import { getProjectsByClientId } from "@/modules/projects/data";
import { ClientRequestsView } from "@/modules/requests/components/client-requests-view";

export const metadata = {
  title: "Requests & Support — Orbit",
  description: "Ask questions, report issues, and communicate with Celestia Studios.",
};

export const dynamic = "force-dynamic";

export default async function ClientRequestsPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/client/requests");
  }

  if (profile.role === "SUPER_ADMIN") {
    redirect("/hq/requests");
  }

  const clientId = profile.client_id;
  const [requests, stats, projects] = clientId
    ? await Promise.all([
        getClientRequestsForClient(clientId),
        getClientRequestStats(clientId),
        getProjectsByClientId(clientId),
      ])
    : [
        [],
        { total: 0, open: 0, inProgress: 0, waitingForClient: 0, resolved: 0, closed: 0 },
        [],
      ];

  return (
    <OrbitShell
      profile={profile}
      basePath="/client"
      title="Support & Requests"
      description="Ask a question, report an issue, or request an update from Celestia Studios."
    >
      <ClientRequestsView
        initialRequests={requests}
        stats={stats}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
    </OrbitShell>
  );
}
