import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { getReceiptById } from "@/modules/payments/data";
import { generateReceiptPdfBuffer } from "@/modules/payments/pdf/receipt-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ paymentId: string }> }
) {
  try {
    const profile = await getAuthenticatedProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { paymentId } = await context.params;
    if (!paymentId) {
      return new NextResponse("Payment ID is required", { status: 400 });
    }

    const receipt = await getReceiptById(paymentId);
    if (!receipt) {
      return new NextResponse("Payment receipt not found", { status: 404 });
    }

    // Receipt Eligibility: Only confirmed / PAID payments can generate a receipt
    if (receipt.status !== "PAID") {
      return new NextResponse("Receipt is available after payment is confirmed.", {
        status: 400,
      });
    }

    // Security Check: Clients can ONLY access their own payment receipts
    if (profile.role !== "SUPER_ADMIN" && profile.client_id !== receipt.client.id) {
      return new NextResponse(
        "Forbidden: You do not have permission to access this payment receipt.",
        { status: 403 }
      );
    }

    const pdfBuffer = await generateReceiptPdfBuffer(receipt);

    const filename = `Receipt-${receipt.receipt_number}.pdf`;

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
    console.error("Error generating receipt PDF:", err);
    return new NextResponse(`Failed to generate receipt PDF: ${msg}`, { status: 500 });
  }
}
