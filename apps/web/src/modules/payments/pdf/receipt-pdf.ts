import PDFDocument from "pdfkit";
import type { ReceiptWithDetails } from "../types";
import { CELESTIA_COMPANY_INFO } from "../config";
import { formatPaymentDate } from "../utils";

function formatPdfCurrency(amount: number, currency: string = "INR"): string {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  return `Rs. ${formatted}`;
}

export async function generateReceiptPdfBuffer(receipt: ReceiptWithDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: `Payment Receipt ${receipt.receipt_number} — ${receipt.client.name}`,
          Author: CELESTIA_COMPANY_INFO.companyName,
          Subject: `Verified Payment Receipt ${receipt.receipt_number}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err: Error) => reject(err));

      const pageWidth = 595.28;
      const left = 40;
      const right = pageWidth - 40;
      const contentWidth = right - left;

      let y = 40;

      // 1. HEADER
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor("#0F172A")
        .text("ORBIT", left, y);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#64748B")
        .text("by Celestia Studios", left, y + 24);

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor("#475569")
        .text(CELESTIA_COMPANY_INFO.tagline, left, y + 38)
        .text(`Email: ${CELESTIA_COMPANY_INFO.email}`, left, y + 50);

      // Right Header
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor("#15803D")
        .text("PAYMENT RECEIPT", right - 220, y, { width: 220, align: "right" });

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#0F172A")
        .text(`Receipt No: ${receipt.receipt_number}`, right - 220, y + 26, {
          width: 220,
          align: "right",
        });

      if (receipt.invoice_number) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#475569")
          .text(`Invoice Ref: ${receipt.invoice_number}`, right - 220, y + 40, {
            width: 220,
            align: "right",
          });
      }

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#475569")
        .text(`Payment Date: ${formatPaymentDate(receipt.payment_date)}`, right - 220, y + 54, {
          width: 220,
          align: "right",
        });

      // Divider Line
      y = 120;
      doc
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .moveTo(left, y)
        .lineTo(right, y)
        .stroke();

      // 2. HIGHLIGHT PAYMENT BOX
      y = 140;
      doc
        .rect(left, y, contentWidth, 110)
        .fillColor("#F0FDF4")
        .fill();

      doc
        .strokeColor("#BBF7D0")
        .lineWidth(1.5)
        .rect(left, y, contentWidth, 110)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor("#15803D")
        .text("PAYMENT CONFIRMED & RECONCILED", left, y + 16, {
          width: contentWidth,
          align: "center",
        });

      doc
        .font("Helvetica-Bold")
        .fontSize(26)
        .fillColor("#0F172A")
        .text(formatPdfCurrency(receipt.amount, receipt.currency), left, y + 36, {
          width: contentWidth,
          align: "center",
        });

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#166534")
        .text(
          `Method: ${receipt.method === "BANK_TRANSFER" ? "Bank Wire / Transfer" : "Razorpay"}  •  Ref: ${
            receipt.transaction_reference || "N/A"
          }  •  Status: PAID`,
          left,
          y + 76,
          { width: contentWidth, align: "center" }
        );

      // 3. TRANSACTION DETAILS
      y = 280;

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#0F172A")
        .text("TRANSACTION DETAILS", left, y);

      const tableY = y + 18;
      const col1X = left;
      const col2X = left + 140;
      const lineHeight = 20;

      const rows: Array<[string, string]> = [
        ["Receipt Number", receipt.receipt_number],
        ["Invoice Reference", receipt.invoice_number || "General Account"],
        ["Client Name", receipt.client.name],
        ["Project", receipt.project ? receipt.project.name : "General Account"],
        [
          "Item Description",
          receipt.schedule_item ? receipt.schedule_item.title : "Account Balance Settlement",
        ],
        ["Payment Method", receipt.method === "BANK_TRANSFER" ? "Bank Transfer" : "Razorpay"],
        ["Transaction Ref (UTR)", receipt.transaction_reference || "—"],
        ["Payment Date", formatPaymentDate(receipt.payment_date)],
        ["Amount Received", formatPdfCurrency(receipt.amount, receipt.currency)],
        ["Verification Status", "VERIFIED & SETTLED"],
      ];

      rows.forEach(([label, value], idx) => {
        const curY = tableY + idx * lineHeight;

        if (idx % 2 === 0) {
          doc
            .rect(left, curY - 3, contentWidth, lineHeight)
            .fillColor("#F8FAFC")
            .fill();
        }

        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#64748B")
          .text(label, col1X + 8, curY);

        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("#0F172A")
          .text(value, col2X, curY, { width: right - col2X - 10 });
      });

      y = tableY + rows.length * lineHeight + 30;

      // 4. VERIFIER INFO & NOTES
      if (receipt.notes) {
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#64748B")
          .text("RECONCILIATION NOTES", left, y);

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#334155")
          .text(receipt.notes, left, y + 14, { width: contentWidth });

        y += 40;
      }

      doc
        .font("Helvetica-Oblique")
        .fontSize(8)
        .fillColor("#64748B")
        .text(
          "This document serves as an official proof of payment received by Celestia Studios.",
          left,
          y,
          { width: contentWidth }
        );

      // 5. FOOTER
      const footerY = 790;
      doc
        .strokeColor("#E2E8F0")
        .lineWidth(0.5)
        .moveTo(left, footerY)
        .lineTo(right, footerY)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor("#94A3B8")
        .text("ORBIT by Celestia Studios • Official Payment Receipt", left, footerY + 8)
        .text("Page 1 of 1", right - 100, footerY + 8, { width: 100, align: "right" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
