import { notFound, redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getRequestById } from "@/modules/requests/data";
import { AdminRequestDetailCard } from "@/modules/requests/components/admin-request-detail-card";

interface HqRequestDetailPageProps {
  params: Promise<{ requestId: string }>;
}

export async function generateMetadata({ params }: HqRequestDetailPageProps) {
  const { requestId } = await params;
  const request = await getRequestById(requestId);

  if (!request) {
    return { title: "Request Not Found — Orbit HQ" };
  }

  return {
    title: `${request.title} — Request Details | Orbit HQ`,
    description: `Change request review for ${request.deliverable?.title || "Deliverable"}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function HqRequestDetailPage({ params }: HqRequestDetailPageProps) {
  const { requestId } = await params;
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect(`/login?redirect=/hq/requests/${requestId}`);
  }

  if (profile.role === "CLIENT") {
    redirect("/client");
  }

  const request = await getRequestById(requestId);
  if (!request) {
    notFound();
  }

  return (
    <OrbitShell
      profile={profile}
      basePath="/hq"
      title="Request Detail"
      description="Review client change request and manage resolution status."
    >
      <AdminRequestDetailCard request={request} />
    </OrbitShell>
  );
}
