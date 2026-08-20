"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createRazorpayOrderAction, verifyRazorpayPaymentAction } from "../razorpay/actions";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutButtonProps {
  scheduleItemId: string;
  amount?: number;
  currency?: string;
  title?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
  onSuccess?: () => void;
}

export function RazorpayCheckoutButton({
  scheduleItemId,
  amount,
  currency = "INR",
  title = "Pay Online",
  size = "sm",
  variant = "default",
  className = "",
  onSuccess,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const router = useRouter();

  // Helper to dynamically load the Razorpay checkout script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert("Failed to load Razorpay checkout SDK. Please check your internet connection.");
        setLoading(false);
        return;
      }

      // 1. Create Server-Side Order
      const res = await createRazorpayOrderAction({ scheduleItemId });

      if (!res.success || !res.orderId || !res.keyId) {
        alert(res.error || "Unable to initialize checkout. Please try again or use Bank Transfer.");
        setLoading(false);
        return;
      }

      // 2. Launch Razorpay Checkout Modal
      const options = {
        key: res.keyId,
        amount: res.amountInPaise,
        currency: res.currency,
        name: "ORBIT",
        description: res.invoiceTitle ? `Payment for ${res.invoiceTitle}` : "Invoice Payment",
        order_id: res.orderId,
        prefill: {
          name: res.clientName || "",
          email: res.clientEmail || "",
          contact: res.clientPhone || "",
        },
        theme: {
          color: "#0F172A",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 3. Cryptographic Signature Verification & Reconciliation
            const verifyRes = await verifyRazorpayPaymentAction({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              scheduleItemId,
            });

            if (verifyRes.success) {
              setSuccess(true);
              setLoading(false);
              router.refresh();
              if (onSuccess) {
                onSuccess();
              }
            } else {
              alert(verifyRes.error || "Signature verification failed. Please contact support.");
              setLoading(false);
            }
          } catch (err: unknown) {
            console.error("Error during payment verification:", err);
            alert("Payment verification encountered an unexpected error.");
            setLoading(false);
          }
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err: unknown) {
      console.error("Error in handleCheckout:", err);
      alert("Failed to initiate online payment.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled
        className={`gap-1.5 text-emerald-400 border-emerald-800/60 bg-emerald-950/30 ${className}`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Paid</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={loading}
      onClick={handleCheckout}
      className={`gap-1.5 cursor-pointer ${className}`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CreditCard className="h-3.5 w-3.5" />
      )}
      <span>{loading ? "Processing..." : title}</span>
    </Button>
  );
}
