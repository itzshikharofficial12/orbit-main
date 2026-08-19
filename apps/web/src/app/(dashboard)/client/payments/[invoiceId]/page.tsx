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

export default async function ClientInvoiceDetailPage(props: {
  params: Promise<{ invoiceId: string }>;
}) {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/client/payments");
  }

  const { invoiceId } = await props.params;

  if (profile.role === "SUPER_ADMIN") {
    redirect(`/hq/payments/${invoiceId}`);
  }

  const invoice = await getInvoiceById(invoiceId);

  // Security isolation: Clients can only access their own invoices
  if (!invoice || invoice.client_id !== profile.client_id) {
    notFound();
  }

  return (
    <OrbitShell
      profile={profile}
      basePath="/client"
      title={`Invoice ${invoice.invoice_number}`}
      description="View invoice breakdown, payment instructions, and download PDF."
    >
      <InvoicePreview invoice={invoice} isSuperAdmin={false} />
    </OrbitShell>
  );
}
