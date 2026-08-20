import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { OrbitShell } from "@/components/layout/orbit-shell";
import { getClientStats, getClientSnapshotsForAdmin } from "@/modules/clients/data";
import { getProjectStats, getProjects } from "@/modules/projects/data";
import {
  getPaymentOverviewMetrics,
  getBillingPlansForAdmin,
  getOverdueScheduleItems,
  getPaymentsForAdmin,
} from "@/modules/payments/data";
import { getUpcomingMeetingsForAdmin } from "@/modules/meetings/data";
import { getRequestStats, getAllRequestsForAdmin } from "@/modules/requests/data";
import { getPendingReviewDeliverablesForAdmin } from "@/modules/deliverables/data";
import {
  HqDashboardView,
  type HqActivityEvent,
} from "@/modules/clients/components/hq-dashboard-view";
import type { ProjectWithNextStep } from "@/modules/projects/types";

export const metadata = {
  title: "HQ — Orbit by Celestia Studios",
  description: "Internal operating system for Celestia Studios.",
};

export const dynamic = "force-dynamic";

export default async function HqPage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/login?redirect=/hq");
  }

  if (profile.role === "CLIENT") {
    redirect("/client");
  }

  const [
    clientStats,
    projectStats,
    paymentMetrics,
    requestStats,
    rawProjects,
    upcomingMeetings,
    clientSnapshots,
    pendingReviewDeliverables,
    overduePayments,
    requests,
    billingPlans,
    recentPayments,
  ] = await Promise.all([
    getClientStats(),
    getProjectStats(),
    getPaymentOverviewMetrics(),
    getRequestStats(),
    getProjects(),
    getUpcomingMeetingsForAdmin(4),
    getClientSnapshotsForAdmin(4),
    getPendingReviewDeliverablesForAdmin(),
    getOverdueScheduleItems(),
    getAllRequestsForAdmin(),
    getBillingPlansForAdmin(),
    getPaymentsForAdmin(),
  ]);

  // Enrich raw projects with next milestone & step
  const projects: ProjectWithNextStep[] = rawProjects.map((p) => {
    return {
      ...p,
      in_progress_milestone_count: 0,
      planned_milestone_count: 0,
      next_step: "Project is in active delivery.",
    };
  });

  // Determine next collection item from schedule items
  let nextCollectionItem: {
    amount: number;
    currency: string;
    title: string;
    clientName?: string;
    projectName?: string;
    dueDate: string | null;
  } | null = null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidateCollections: Array<{
    amount: number;
    currency: string;
    title: string;
    clientName?: string;
    projectName?: string;
    dueDate: string | null;
    daysRemaining: number;
  }> = [];

  for (const plan of billingPlans) {
    if (plan.status === "CANCELLED") continue;
    for (const item of plan.schedule_items || []) {
      const paid = (item.payments || [])
        .filter((p) => p.status === "PAID")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const remaining = Math.max(0, Number(item.amount) - paid);

      if (remaining > 0 && item.due_date) {
        const dDate = new Date(item.due_date);
        dDate.setHours(0, 0, 0, 0);
        const daysRemaining = Math.ceil(
          (dDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysRemaining >= 0) {
          candidateCollections.push({
            amount: remaining,
            currency: plan.currency || "INR",
            title: item.title || plan.name,
            clientName: plan.client?.name,
            projectName: plan.project?.name,
            dueDate: item.due_date,
            daysRemaining,
          });
        }
      }
    }
  }

  candidateCollections.sort((a, b) => a.daysRemaining - b.daysRemaining);
  if (candidateCollections.length > 0) {
    nextCollectionItem = candidateCollections[0];
  }

  // Synthesize recent activities from real data
  const activities: Array<{
    id: string;
    category: "PAYMENT" | "DELIVERABLE" | "MILESTONE" | "CLIENT" | "REQUEST" | "MEETING";
    title: string;
    description?: string;
    date: Date;
    timestamp: string;
  }> = [];

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
        title: `Deliverable "${deliv.title}" ready for review`,
        description: deliv.project?.name,
        date: d,
        timestamp: formatRelative(d),
      });
    }
  }

  // 2. Payments activities
  for (const p of recentPayments) {
    if (p.status === "PAID" && p.paid_at) {
      const d = new Date(p.paid_at);
      activities.push({
        id: `act-pay-${p.id}`,
        category: "PAYMENT",
        title: `Payment of ₹${Number(p.amount).toLocaleString("en-IN")} verified`,
        description: p.client?.name ? `${p.client.name}` : "Settlement confirmed",
        date: d,
        timestamp: formatRelative(d),
      });
    }
  }

  // 3. Requests activities
  for (const r of requests.slice(0, 5)) {
    const d = new Date(r.updated_at || r.created_at);
    activities.push({
      id: `act-req-${r.id}`,
      category: "REQUEST",
      title: `${r.reference_number || "REQ"}: "${r.title}"`,
      description: r.client?.name ? `${r.client.name} · ${r.status.replace(/_/g, " ")}` : `Status: ${r.status}`,
      date: d,
      timestamp: formatRelative(d),
    });
  }

  // 4. Upcoming Meetings
  for (const m of upcomingMeetings) {
    const d = new Date(m.created_at || m.starts_at);
    activities.push({
      id: `act-meet-${m.id}`,
      category: "MEETING",
      title: `Meeting: "${m.title}" scheduled`,
      description: m.client?.name ? `${m.client.name}` : undefined,
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
      basePath="/hq"
      title={`Namaste, ${firstName}`}
      description="Celestia Studios Headquarters"
    >
      <HqDashboardView
        clientStats={clientStats}
        projectStats={projectStats}
        paymentMetrics={paymentMetrics}
        requestStats={requestStats}
        projects={projects}
        upcomingMeetings={upcomingMeetings}
        clientSnapshots={clientSnapshots}
        pendingReviewDeliverables={pendingReviewDeliverables}
        overduePayments={overduePayments}
        activeRequests={activeRequests}
        recentActivities={activities.slice(0, 6)}
        nextCollectionItem={nextCollectionItem}
      />
    </OrbitShell>
  );
}
