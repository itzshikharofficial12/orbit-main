import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { getInvoiceById } from "@/modules/payments/data";
import { generateInvoicePdfBuffer } from "@/modules/payments/pdf/invoice-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const profile = await getAuthenticatedProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { invoiceId } = await context.params;
    if (!invoiceId) {
      return new NextResponse("Invoice ID is required", { status: 400 });
    }

    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    // Security Check: Clients can ONLY access their own invoice
    if (profile.role !== "SUPER_ADMIN" && profile.client_id !== invoice.client_id) {
      return new NextResponse("Forbidden: You do not have permission to access this invoice.", {
        status: 403,
      });
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoice);

    const filename = `Invoice-${invoice.invoice_number}.pdf`;

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Error generating invoice PDF:", err);
    return new NextResponse(`Failed to generate invoice PDF: ${msg}`, { status: 500 });
  }
}
