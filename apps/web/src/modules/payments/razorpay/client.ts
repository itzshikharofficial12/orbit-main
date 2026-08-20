import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "@/lib/env";

let razorpayInstance: Razorpay | null = null;

/**
 * Initializes and returns the server-side Razorpay SDK instance.
 * Exclusively for server-side operations (Actions, API Routes).
 */
export function getRazorpayClient(): Razorpay {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  const key_id = env.razorpayKeyId;
  const key_secret = env.razorpayKeySecret;

  if (!key_id || !key_secret) {
    throw new Error(
      "Razorpay credentials are not configured. Please define RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }

  razorpayInstance = new Razorpay({
    key_id,
    key_secret,
  });

  return razorpayInstance;
}

/**
 * Verifies the client checkout payment signature returned by Razorpay Checkout.
 * Signature formula: HMAC-SHA256(order_id + "|" + payment_id, secret)
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { orderId, paymentId, signature } = params;
  const secret = env.razorpayKeySecret;

  if (!secret || !orderId || !paymentId || !signature) {
    return false;
  }

  try {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    const signatureBuffer = Buffer.from(signature, "utf-8");

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    console.error("Error verifying Razorpay payment signature:", err);
    return false;
  }
}

/**
 * Verifies the incoming Razorpay webhook signature header (`x-razorpay-signature`).
 * Signature formula: HMAC-SHA256(rawBody, webhookSecret)
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret?: string
): boolean {
  const secret = webhookSecret || env.razorpayWebhookSecret;

  if (!secret || !rawBody || !signature) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    const signatureBuffer = Buffer.from(signature, "utf-8");

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    console.error("Error verifying Razorpay webhook signature:", err);
    return false;
  }
}
