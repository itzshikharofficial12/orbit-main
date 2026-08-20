import {
  HelpCircle,
  FolderKanban,
  FileCheck,
  CreditCard,
  Video,
  AlertTriangle,
  Inbox,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { RequestCategory, RequestStatus, ClientRequestPriority } from "./types";

export interface CategoryInfo {
  label: string;
  icon: LucideIcon;
  colorClass: string;
}

export interface StatusInfo {
  label: string;
  colorClass: string;
}

export interface PriorityInfo {
  label: string;
  colorClass: string;
}

export function getCategoryInfo(category: RequestCategory | string | undefined | null): CategoryInfo {
  const cat = (category || "GENERAL").toUpperCase();

  switch (cat) {
    case "PROJECT":
      return {
        label: "Project",
        icon: FolderKanban,
        colorClass: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
      };
    case "DELIVERABLE":
      return {
        label: "Deliverable",
        icon: FileCheck,
        colorClass: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      };
    case "PAYMENT":
      return {
        label: "Payment",
        icon: CreditCard,
        colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      };
    case "MEETING":
      return {
        label: "Meeting",
        icon: Video,
        colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      };
    case "TECHNICAL":
      return {
        label: "Technical Issue",
        icon: AlertTriangle,
        colorClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      };
    case "OTHER":
      return {
        label: "Other",
        icon: Inbox,
        colorClass: "bg-secondary text-foreground border-border/60",
      };
    case "GENERAL":
    default:
      return {
        label: "General",
        icon: HelpCircle,
        colorClass: "bg-secondary text-muted-foreground border-border/60",
      };
  }
}

export function getStatusInfo(status: RequestStatus | string | undefined | null): StatusInfo {
  const st = (status || "OPEN").toUpperCase();

  switch (st) {
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        colorClass: "bg-blue-500/15 text-blue-400 border-blue-500/30 font-medium",
      };
    case "WAITING_FOR_CLIENT":
      return {
        label: "Waiting for You",
        colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold",
      };
    case "RESOLVED":
      return {
        label: "Resolved",
        colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      };
    case "CLOSED":
      return {
        label: "Closed",
        colorClass: "bg-secondary text-muted-foreground/70 border-border/40",
      };
    case "OPEN":
    default:
      return {
        label: "Open",
        colorClass: "bg-secondary text-muted-foreground border-border/60",
      };
  }
}

export function getPriorityInfo(priority: ClientRequestPriority | string | undefined | null): PriorityInfo {
  const prio = (priority || "MEDIUM").toUpperCase();

  switch (prio) {
    case "URGENT":
      return {
        label: "Urgent",
        colorClass: "bg-destructive/20 text-destructive border-destructive/40 font-semibold",
      };
    case "HIGH":
      return {
        label: "High",
        colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30 font-medium",
      };
    case "LOW":
      return {
        label: "Low",
        colorClass: "bg-secondary text-muted-foreground/70 border-border/40",
      };
    case "MEDIUM":
    case "NORMAL":
    default:
      return {
        label: "Normal",
        colorClass: "bg-secondary text-foreground border-border/60",
      };
  }
}

export function formatRequestDate(isoString: string): string {
  try {
    const timestamp = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - timestamp) / 1000);

    if (diffSec < 45) return "Just now";
    if (diffSec < 3600) {
      const mins = Math.max(1, Math.floor(diffSec / 60));
      return `${mins}m ago`;
    }
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours}h ago`;
    }
    if (diffSec < 172800) {
      return "Yesterday";
    }
    if (diffSec < 604800) {
      const days = Math.floor(diffSec / 86400);
      return `${days}d ago`;
    }

    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return isoString;
  }
}
