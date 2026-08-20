import { notFound, redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getRequestById } from "@/modules/requests/data";
import { ClientRequestDetailView } from "@/modules/requests/components/client-request-detail-view";

interface ClientRequestDetailPageProps {
  params: Promise<{ requestId: string }>;
}

export async function generateMetadata({ params }: ClientRequestDetailPageProps) {
  const { requestId } = await params;
  const request = await getRequestById(requestId);

  if (!request) {
    return { title: "Request Not Found — Orbit" };
  }

  const refTag = request.reference_number || "REQ";
  return {
    title: `${refTag}: ${request.title} — Requests | Orbit`,
    description: `Support request details and conversation for ${request.title}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function ClientRequestDetailPage({ params }: ClientRequestDetailPageProps) {
  const { requestId } = await params;
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect(`/login?redirect=/client/requests/${requestId}`);
  }

  if (profile.role === "SUPER_ADMIN") {
    redirect(`/hq/requests/${requestId}`);
  }

  const request = await getRequestById(requestId);
  if (!request) {
    notFound();
  }

  // Security check: Client must own this request
  if (profile.client_id && request.client_id !== profile.client_id) {
    notFound();
  }

  const refTag = request.reference_number || "REQ";

  return (
    <OrbitShell
      profile={profile}
      basePath="/client"
      title={refTag}
      description="Support request details and response thread from Celestia Studios."
    >
      <ClientRequestDetailView request={request} />
    </OrbitShell>
  );
}
