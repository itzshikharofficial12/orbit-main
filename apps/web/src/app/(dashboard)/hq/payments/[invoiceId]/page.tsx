import { notFound, redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getInvoiceById } from "@/modules/payments/data";
import { InvoicePreview } from "@/modules/payments/components/invoice-preview";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await props.params;
  return {
    title: `Invoice ${invoiceId} — Orbit`,
    description: "Authoritative invoice details and PDF download.",
  };
}

export default async function HqInvoiceDetailPage(props: {
  params: Promise<{ invoiceId: string }>;
}) {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/hq/payments");
  }

  if (profile.role !== "SUPER_ADMIN") {
    redirect("/client");
  }

  const { invoiceId } = await props.params;
  const invoice = await getInvoiceById(invoiceId);

  if (!invoice) {
    notFound();
  }

  return (
    <OrbitShell
      profile={profile}
      basePath="/hq"
      title={`Invoice ${invoice.invoice_number}`}
      description={`Commercial invoice for ${invoice.client.name}`}
    >
      <InvoicePreview invoice={invoice} isSuperAdmin={true} />
    </OrbitShell>
  );
}
