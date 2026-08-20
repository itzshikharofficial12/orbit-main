import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getClientById } from "@/modules/clients/data";
import { getClientProjectsWithOverview } from "@/modules/projects/data";
import { getPendingReviewDeliverablesForClient } from "@/modules/deliverables/data";
import { getUpcomingMeetingForClient } from "@/modules/meetings/data";
import { getClientBillingOverview } from "@/modules/payments/data";
import { getClientRequestsForClient } from "@/modules/requests/data";
import {
  ClientHomeView,
  type UpcomingPaymentItem,
  type ActivityEvent,
} from "@/modules/clients/components/client-home-view";

export const metadata = {
  title: "Workspace — Orbit by Celestia Studios",
  description: "Celestia Studios client workspace overview.",
};

export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/client");
  }

  if (profile.role === "SUPER_ADMIN") {
    redirect("/hq");
  }

  const clientId = profile.client_id;

  const [
    client,
    projects,
    pendingReviewDeliverables,
    upcomingMeeting,
    billingOverview,
    requests,
  ] = await Promise.all([
    clientId ? getClientById(clientId) : Promise.resolve(null),
    clientId ? getClientProjectsWithOverview(clientId) : Promise.resolve([]),
    getPendingReviewDeliverablesForClient(),
    clientId ? getUpcomingMeetingForClient(clientId) : Promise.resolve(null),
    clientId ? getClientBillingOverview(clientId) : Promise.resolve(null),
    clientId ? getClientRequestsForClient(clientId) : Promise.resolve([]),
  ]);

  // Determine the next upcoming payment item
  let upcomingPayment: UpcomingPaymentItem | null = null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (billingOverview?.plans) {
    const candidateItems: UpcomingPaymentItem[] = [];

    for (const plan of billingOverview.plans) {
      if (plan.status === "CANCELLED") continue;

      for (const item of plan.schedule_items || []) {
        const itemPayments = (item.payments || []).filter((p) => p.status === "PAID");
        const paidAmount = itemPayments.reduce(
          (acc, p) => acc + (Number(p.amount) || 0),
          0
        );
        const remaining = Math.max(0, Number(item.amount) - paidAmount);

        if (remaining > 0) {
          let isOverdue = false;
          let daysRemaining = 999;

          if (item.due_date) {
            const dueDate = new Date(item.due_date);
            dueDate.setHours(0, 0, 0, 0);
            const diffTime = dueDate.getTime() - today.getTime();
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (daysRemaining < 0) isOverdue = true;
          }

          candidateItems.push({
            id: item.id,
            amount: remaining,
            currency: plan.currency || "INR",
            title: item.title || plan.name,
            projectName: plan.project?.name,
            dueDate: item.due_date,
            isOverdue,
            daysRemaining,
          });
        }
      }
    }

    // Sort: overdue first, then by daysRemaining ascending
    candidateItems.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.daysRemaining - b.daysRemaining;
    });

    if (candidateItems.length > 0) {
      upcomingPayment = candidateItems[0];
    }
  }

  // Synthesize recent activities from real data
  const activities: Array<{
    id: string;
    category: "DELIVERABLE" | "PAYMENT" | "REQUEST" | "MEETING" | "PROJECT";
    title: string;
    description?: string;
    date: Date;
    timestamp: string;
  }> = [];

  // Helper for relative format
  function formatRelative(d: Date): string {
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 3600) return "Just now";
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours}h ago`;
    }
    if (diffSec < 172800) return "Yesterday";
    if (diffSec < 604800) {
      const days = Math.floor(diffSec / 86400);
      return `${days}d ago`;
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // 1. Deliverables activities
  for (const deliv of pendingReviewDeliverables) {
    if (deliv.submitted_at) {
      const d = new Date(deliv.submitted_at);
      activities.push({
        id: `act-deliv-${deliv.id}`,
        category: "DELIVERABLE",
        title: `"${deliv.title}" submitted for review`,
        description: deliv.milestone?.name,
        date: d,
        timestamp: formatRelative(d),
      });
    }
  }

  // 2. Payments activities
  if (billingOverview?.payments) {
    for (const p of billingOverview.payments) {
      if (p.status === "PAID" && p.paid_at) {
        const d = new Date(p.paid_at);
        activities.push({
          id: `act-pay-${p.id}`,
          category: "PAYMENT",
          title: `Payment of ${p.currency === "INR" ? "₹" : "$"}${Number(p.amount).toLocaleString("en-IN")} verified`,
          description: p.receipt_number ? `Receipt #${p.receipt_number}` : "Payment confirmed",
          date: d,
          timestamp: formatRelative(d),
        });
      }
    }
  }

  // 3. Requests activities
  for (const r of requests) {
    const d = new Date(r.updated_at || r.created_at);
    activities.push({
      id: `act-req-${r.id}`,
      category: "REQUEST",
      title: `${r.reference_number || "Request"}: "${r.title}"`,
      description: r.status === "RESOLVED" ? "Marked as resolved" : `Status: ${r.status.replace(/_/g, " ")}`,
      date: d,
      timestamp: formatRelative(d),
    });
  }

  // Sort activities by date descending
  activities.sort((a, b) => b.date.getTime() - a.date.getTime());

  const activeRequests = requests.filter(
    (r) => r.status === "OPEN" || r.status === "IN_PROGRESS" || r.status === "WAITING_FOR_CLIENT"
  );

  const firstName = profile.first_name || "there";

  return (
    <OrbitShell
      profile={profile}
      basePath="/client"
      title={`Namaste, ${firstName}`}
      description="Here's what's happening with your Celestia Studios workspace."
    >
      <ClientHomeView
        profile={profile}
        client={client}
        projects={projects}
        pendingReviewDeliverables={pendingReviewDeliverables}
        upcomingMeeting={upcomingMeeting}
        upcomingPayment={upcomingPayment}
        activeRequests={activeRequests}
        recentActivities={activities.slice(0, 5)}
      />
    </OrbitShell>
  );
}
