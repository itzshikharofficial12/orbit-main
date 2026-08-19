import PDFDocument from "pdfkit";
import type { InvoiceWithDetails } from "../types";
import { CELESTIA_COMPANY_INFO } from "../config";
import { formatPaymentDate } from "../utils";

/**
 * Formats currency for clean, readable PDF print (e.g. "Rs. 1,50,000" or "INR 1,50,000")
 */
function formatPdfCurrency(amount: number, currency: string = "INR"): string {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  return `Rs. ${formatted}`;
}

export async function generateInvoicePdfBuffer(invoice: InvoiceWithDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: `Invoice ${invoice.invoice_number} — ${invoice.client.name}`,
          Author: CELESTIA_COMPANY_INFO.companyName,
          Subject: `Commercial Invoice ${invoice.invoice_number}`,
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

      // 1. HEADER SECTION
      // Left: Company / Studio Brand
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
        .text(CELESTIA_COMPANY_INFO.address, left, y + 50)
        .text(`Email: ${CELESTIA_COMPANY_INFO.email}`, left, y + 62);

      // Right: Invoice Title & Meta
      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor("#0F172A")
        .text("INVOICE", right - 220, y, { width: 220, align: "right" });

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#0F172A")
        .text(`Invoice No: ${invoice.invoice_number}`, right - 220, y + 28, {
          width: 220,
          align: "right",
        });

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#475569")
        .text(`Issue Date: ${formatPaymentDate(invoice.issue_date)}`, right - 220, y + 44, {
          width: 220,
          align: "right",
        })
        .text(`Due Date: ${formatPaymentDate(invoice.due_date)}`, right - 220, y + 58, {
          width: 220,
          align: "right",
        });

      // Status Badge Stamp
      const statusLabel = invoice.status.replace("_", " ");
      let statusBg = "#E2E8F0";
      let statusColor = "#334155";

      if (invoice.status === "PAID") {
        statusBg = "#DCFCE7";
        statusColor = "#15803D";
      } else if (invoice.status === "PARTIALLY_PAID") {
        statusBg = "#CFFAFE";
        statusColor = "#0E7490";
      } else if (invoice.status === "OVERDUE") {
        statusBg = "#FEE2E2";
        statusColor = "#B91C1C";
      } else if (invoice.status === "DUE") {
        statusBg = "#FEF3C7";
        statusColor = "#B45309";
      }

      const badgeWidth = 90;
      const badgeX = right - badgeWidth;
      const badgeY = y + 74;

      doc
        .roundedRect(badgeX, badgeY, badgeWidth, 18, 3)
        .fillColor(statusBg)
        .fill();

      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(statusColor)
        .text(statusLabel, badgeX, badgeY + 4, {
          width: badgeWidth,
          align: "center",
        });

      // Divider Line
      y = 135;
      doc
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .moveTo(left, y)
        .lineTo(right, y)
        .stroke();

      // 2. BILL TO & PROJECT SECTION
      y = 150;

      // Left Column: Bill To
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#64748B")
        .text("BILL TO", left, y);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#0F172A")
        .text(invoice.client.name, left, y + 14);

      let billToY = y + 28;
      if (invoice.client.primary_contact_name) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#334155")
          .text(`Attn: ${invoice.client.primary_contact_name}`, left, billToY);
        billToY += 12;
      }
      if (invoice.client.primary_contact_email) {
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor("#475569")
          .text(invoice.client.primary_contact_email, left, billToY);
        billToY += 12;
      }
      if (invoice.client.primary_contact_phone) {
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor("#475569")
          .text(invoice.client.primary_contact_phone, left, billToY);
        billToY += 12;
      }

      // Right Column: Engagement & Project
      const rightColX = left + 280;
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#64748B")
        .text("ENGAGEMENT & PROJECT", rightColX, y);

      if (invoice.project) {
        doc
          .font("Helvetica-Bold")
          .fontSize(10.5)
          .fillColor("#0F172A")
          .text(invoice.project.name, rightColX, y + 14);

        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor("#475569")
          .text(`Service: ${invoice.project.service_type.replace("_", " ")}`, rightColX, y + 28)
          .text(`Billing Plan: ${invoice.billing_plan.name}`, rightColX, y + 40);
      } else {
        doc
          .font("Helvetica-Bold")
          .fontSize(10.5)
          .fillColor("#0F172A")
          .text("General Client Account", rightColX, y + 14);

        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor("#475569")
          .text(`Billing Plan: ${invoice.billing_plan.name}`, rightColX, y + 28);
      }

      // 3. LINE ITEMS TABLE
      y = Math.max(billToY + 10, y + 65);

      // Table Header Bar
      const tableHeadY = y;
      doc
        .rect(left, tableHeadY, contentWidth, 22)
        .fillColor("#F8FAFC")
        .fill();

      doc
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .rect(left, tableHeadY, contentWidth, 22)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#334155")
        .text("DESCRIPTION", left + 10, tableHeadY + 6)
        .text("QTY", left + 290, tableHeadY + 6, { width: 40, align: "center" })
        .text("UNIT PRICE", left + 340, tableHeadY + 6, { width: 80, align: "right" })
        .text("AMOUNT", right - 90, tableHeadY + 6, { width: 80, align: "right" });

      // Table Rows
      let rowY = tableHeadY + 22;

      // Primary Line Item
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor("#0F172A")
        .text(invoice.title, left + 10, rowY + 8);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#334155")
        .text("1", left + 290, rowY + 8, { width: 40, align: "center" })
        .text(formatPdfCurrency(invoice.amount, invoice.currency), left + 340, rowY + 8, {
          width: 80,
          align: "right",
        })
        .text(formatPdfCurrency(invoice.amount, invoice.currency), right - 90, rowY + 8, {
          width: 80,
          align: "right",
        });

      let itemDescY = rowY + 24;
      if (invoice.description) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#64748B")
          .text(invoice.description, left + 10, itemDescY, { width: 270 });
        itemDescY += 16;
      }

      if (invoice.milestone) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#64748B")
          .text(`Milestone Reference: ${invoice.milestone.name}`, left + 10, itemDescY, {
            width: 270,
          });
        itemDescY += 14;
      }

      rowY = Math.max(rowY + 38, itemDescY + 6);

      // Bottom Row Line
      doc
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .moveTo(left, rowY)
        .lineTo(right, rowY)
        .stroke();

      // 4. SUMMARY SECTION (Right Aligned Box)
      y = rowY + 12;
      const summaryWidth = 220;
      const summaryX = right - summaryWidth;

      const subtotal = invoice.amount;
      const tax = invoice.tax_amount || 0;
      const total = subtotal + tax;
      const paid = invoice.paid_amount || 0;
      const balance = invoice.balance_due;

      // Subtotal
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#475569")
        .text("Subtotal", summaryX, y)
        .text(formatPdfCurrency(subtotal, invoice.currency), summaryX, y, {
          width: summaryWidth,
          align: "right",
        });

      // Tax
      doc
        .text("Tax / GST (0%)", summaryX, y + 15)
        .text(formatPdfCurrency(tax, invoice.currency), summaryX, y + 15, {
          width: summaryWidth,
          align: "right",
        });

      // Total Line
      doc
        .strokeColor("#CBD5E1")
        .lineWidth(0.5)
        .moveTo(summaryX, y + 30)
        .lineTo(right, y + 30)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#0F172A")
        .text("Total", summaryX, y + 36)
        .text(formatPdfCurrency(total, invoice.currency), summaryX, y + 36, {
          width: summaryWidth,
          align: "right",
        });

      // Amount Paid
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#15803D")
        .text("Amount Paid", summaryX, y + 54)
        .text(formatPdfCurrency(paid, invoice.currency), summaryX, y + 54, {
          width: summaryWidth,
          align: "right",
        });

      // Balance Due (Highlighted Box)
      const balanceBoxY = y + 72;
      doc
        .rect(summaryX - 10, balanceBoxY, summaryWidth + 10, 26)
        .fillColor(balance === 0 ? "#DCFCE7" : "#FEF3C7")
        .fill();

      doc
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .fillColor(balance === 0 ? "#15803D" : "#B45309")
        .text("Balance Due", summaryX, balanceBoxY + 7)
        .text(formatPdfCurrency(balance, invoice.currency), summaryX, balanceBoxY + 7, {
          width: summaryWidth,
          align: "right",
        });

      // 5. PAYMENT INFORMATION BOX (Left Column)
      const payBoxY = y;
      const payBoxWidth = 250;

      doc
        .rect(left, payBoxY, payBoxWidth, 98)
        .fillColor("#F8FAFC")
        .fill();

      doc
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .rect(left, payBoxY, payBoxWidth, 98)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#0F172A")
        .text("BANK TRANSFER / PAYMENT DETAILS", left + 10, payBoxY + 8);

      const bank = CELESTIA_COMPANY_INFO.bankDetails;
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#334155")
        .text(`Bank Name: ${bank.bankName}`, left + 10, payBoxY + 22)
        .text(`Account Name: ${bank.accountName}`, left + 10, payBoxY + 34)
        .text(`Account No: ${bank.accountNumber}`, left + 10, payBoxY + 46)
        .text(`IFSC Code: ${bank.ifscCode}`, left + 10, payBoxY + 58)
        .text(`UPI ID: ${bank.upiId}`, left + 10, payBoxY + 70)
        .font("Helvetica-Oblique")
        .fontSize(7.5)
        .fillColor("#64748B")
        .text(`* Please reference ${invoice.invoice_number} in transfer memo`, left + 10, payBoxY + 84);

      // 6. NOTES / TERMS SECTION
      y = balanceBoxY + 40;

      const termsText = invoice.terms || CELESTIA_COMPANY_INFO.defaultTerms;
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#64748B")
        .text("TERMS & CONDITIONS", left, y);

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor("#475569")
        .text(termsText, left, y + 12, { width: contentWidth });

      if (invoice.notes) {
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#64748B")
          .text("NOTES", left, y + 38);

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#475569")
          .text(invoice.notes, left, y + 50, { width: contentWidth });
      }

      // 7. FOOTER
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
        .text("ORBIT by Celestia Studios • Authoritative Billing Document", left, footerY + 8)
        .text("Page 1 of 1", right - 100, footerY + 8, { width: 100, align: "right" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
