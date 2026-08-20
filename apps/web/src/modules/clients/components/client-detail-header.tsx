"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, UserCheck, AlertCircle, Edit3, UserPlus, Building2 } from "lucide-react";
import { OrbitAvatar } from "@/components/ui/orbit-avatar";
import { NotificationCenter } from "@/modules/notifications/components/notification-center";
import { ClientStatusBadge } from "./client-status-badge";
import { AssignPmDialog } from "@/modules/team/components/assign-pm-dialog";
import { updateClientStatusAction } from "../actions";
import type { ClientWithPm, ClientStatus } from "../types";
import type { TeamMember } from "@/modules/team/types";

interface ClientDetailHeaderProps {
  client: ClientWithPm;
  projectManagers?: TeamMember[];
}

export function ClientDetailHeader({ client, projectManagers = [] }: ClientDetailHeaderProps) {
  const [currentStatus, setCurrentStatus] = React.useState<ClientStatus>(client.status);
  const [isUpdating, setIsUpdating] = React.useState(false);

  async function handleStatusChange(newStatus: ClientStatus) {
    if (newStatus === currentStatus || isUpdating) return;

    setIsUpdating(true);
    setCurrentStatus(newStatus);

    const result = await updateClientStatusAction(client.id, newStatus);
    if (!result.success) {
      // Revert if failed
      setCurrentStatus(client.status);
    }
    setIsUpdating(false);
  }

  return (
    <div className="space-y-4">
      {/* Back Navigation & Utilities */}
      <div className="flex items-center justify-between">
        <Link
          href="/hq/clients"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Clients</span>
        </Link>
        <NotificationCenter />
      </div>

      {/* Primary Authoritative Client Identity Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pb-5 border-b border-border/50">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
            {client.name[0]?.toUpperCase() || "C"}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                {client.name}
              </h1>
              <ClientStatusBadge status={currentStatus} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono">ID: {client.id}</span>
              <span>•</span>
              <span>Contact: {client.primary_contact_name} ({client.primary_contact_email})</span>
            </div>
          </div>
        </div>

        {/* Top Right: Prominent Project Manager Highlight & Status Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Primary PM Chip */}
          {client.project_manager ? (
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 shadow-sm text-xs">
              <OrbitAvatar
                src={client.project_manager.avatar_url}
                name={`${client.project_manager.first_name} ${client.project_manager.last_name || ""}`}
                size="xs"
                className="shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-muted-foreground leading-tight">Primary PM</span>
                <span className="font-semibold text-foreground leading-tight">
                  {client.project_manager.first_name} {client.project_manager.last_name || ""}
                </span>
              </div>
              <AssignPmDialog
                clientId={client.id}
                clientName={client.name}
                currentPm={client.project_manager}
                projectManagers={projectManagers}
                trigger={
                  <button className="text-[11px] font-medium text-primary hover:underline ml-1 px-1.5 py-0.5 rounded hover:bg-primary/10 transition-colors cursor-pointer">
                    Change
                  </button>
                }
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="font-medium">No Project Manager</span>
              <AssignPmDialog
                clientId={client.id}
                clientName={client.name}
                currentPm={null}
                projectManagers={projectManagers}
                trigger={
                  <button className="text-[11px] font-semibold text-amber-400 hover:underline ml-1 px-1.5 py-0.5 rounded hover:bg-amber-500/20 transition-colors cursor-pointer">
                    + Assign PM
                  </button>
                }
              />
            </div>
          )}

          {/* Quick Status Selector */}
          <div className="flex items-center gap-2 bg-secondary/50 px-2.5 py-1 rounded-lg border border-border/70">
            <label htmlFor="status_changer" className="text-xs text-muted-foreground whitespace-nowrap">
              Status:
            </label>
            <select
              id="status_changer"
              value={currentStatus}
              disabled={isUpdating}
              onChange={(e) => handleStatusChange(e.target.value as ClientStatus)}
              className="h-7 rounded border-0 bg-transparent text-xs text-foreground font-semibold focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="ACTIVE" className="bg-popover text-foreground">ACTIVE</option>
              <option value="PAUSED" className="bg-popover text-foreground">PAUSED</option>
              <option value="COMPLETED" className="bg-popover text-foreground">COMPLETED</option>
              <option value="ARCHIVED" className="bg-popover text-foreground">ARCHIVED</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
