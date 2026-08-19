"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientStatusBadge } from "./client-status-badge";
import { updateClientStatusAction } from "../actions";
import type { Client, ClientStatus } from "../types";

interface ClientDetailHeaderProps {
  client: Client;
}

export function ClientDetailHeader({ client }: ClientDetailHeaderProps) {
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
      {/* Back Navigation */}
      <div>
        <Link
          href="/hq/clients"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Clients</span>
        </Link>
      </div>

      {/* Main Title & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {client.name}
            </h1>
            <ClientStatusBadge status={currentStatus} />
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Client ID: {client.id}
          </p>
        </div>

        {/* Quick Status Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="status_changer" className="text-xs text-muted-foreground whitespace-nowrap">
            Status:
          </label>
          <select
            id="status_changer"
            value={currentStatus}
            disabled={isUpdating}
            onChange={(e) => handleStatusChange(e.target.value as ClientStatus)}
            className="h-8 rounded-md border border-border/80 bg-secondary/80 px-2.5 text-xs text-foreground font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
      </div>
    </div>
  );
}
