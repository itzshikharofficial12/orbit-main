"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ChevronRight, Building2, Mail, Phone, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClientStatusBadge } from "./client-status-badge";
import type { ClientWithPm, ClientStatus } from "../types";
import type { TeamMember } from "@/modules/team/types";
import { cn } from "@/lib/utils";

interface ClientListProps {
  initialClients: ClientWithPm[];
}

export function ClientList({ initialClients }: ClientListProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<ClientStatus | "ALL">("ALL");

  const filteredClients = React.useMemo(() => {
    return initialClients.filter((client) => {
      // Status filter
      if (selectedStatus !== "ALL" && client.status !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = client.name.toLowerCase().includes(query);
        const matchesContact = client.primary_contact_name.toLowerCase().includes(query);
        const matchesEmail = client.primary_contact_email.toLowerCase().includes(query);
        const matchesPm = client.project_manager
          ? `${client.project_manager.first_name} ${client.project_manager.last_name || ""}`
              .toLowerCase()
              .includes(query)
          : false;
        return matchesName || matchesContact || matchesEmail || matchesPm;
      }

      return true;
    });
  }, [initialClients, searchQuery, selectedStatus]);

  const statusCounts = React.useMemo(() => {
    const counts = { ALL: initialClients.length, ACTIVE: 0, PAUSED: 0, COMPLETED: 0, ARCHIVED: 0 };
    initialClients.forEach((c) => {
      if (c.status in counts) {
        counts[c.status as ClientStatus] += 1;
      }
    });
    return counts;
  }, [initialClients]);

  const filterTabs: Array<{ id: ClientStatus | "ALL"; label: string; count: number }> = [
    { id: "ALL", label: "All Clients", count: statusCounts.ALL },
    { id: "ACTIVE", label: "Active", count: statusCounts.ACTIVE },
    { id: "PAUSED", label: "Paused", count: statusCounts.PAUSED },
    { id: "COMPLETED", label: "Completed", count: statusCounts.COMPLETED },
    { id: "ARCHIVED", label: "Archived", count: statusCounts.ARCHIVED },
  ];

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                selectedStatus === tab.id
                  ? "bg-secondary text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                  selectedStatus === tab.id
                    ? "bg-background text-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client or PM..."
            className="pl-8 h-8 text-xs bg-card/60 border-border/80 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Table / List View */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
              <div className="rounded-full bg-secondary/80 p-3 text-muted-foreground border border-border/40">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-medium text-foreground">No clients found</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {searchQuery || selectedStatus !== "ALL"
                    ? "No clients match your selected filters. Try changing your search query."
                    : "Add your first client to begin managing projects, billing, and team assignments."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/30 text-[11px] font-medium uppercase tracking-wider text-muted-foreground font-mono">
                    <th className="py-3 px-5">Client</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Primary Contact</th>
                    <th className="py-3 px-5">Project Manager</th>
                    <th className="py-3 px-5">Created</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-secondary/30 transition-colors group cursor-pointer"
                      onClick={() => {
                        window.location.href = `/hq/clients/${client.id}`;
                      }}
                    >
                      {/* Client Name */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/hq/clients/${client.id}`}
                              className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>{client.name}</span>
                            </Link>
                          </div>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {client.primary_contact_email}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <ClientStatusBadge status={client.status} />
                      </td>

                      {/* Primary Contact */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <span className="text-sm font-medium text-foreground">
                            {client.primary_contact_name}
                          </span>
                          {client.primary_contact_phone && (
                            <span className="mt-0.5 font-mono">{client.primary_contact_phone}</span>
                          )}
                        </div>
                      </td>

                      {/* Project Manager */}
                      <td className="py-4 px-5">
                        {client.project_manager ? (
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs shadow-xs">
                            <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] shrink-0">
                              {client.project_manager.first_name[0]}
                            </div>
                            <span className="font-medium text-foreground whitespace-nowrap">
                              {client.project_manager.first_name}{" "}
                              {client.project_manager.last_name || ""}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {formatDate(client.created_at)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/hq/clients/${client.id}`}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground group-hover:text-foreground hover:bg-secondary transition-colors"
                          aria-label={`Open ${client.name} workspace`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (Hidden on desktop) */}
            <div className="md:hidden space-y-3">
              {filteredClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/hq/clients/${client.id}`}
                  className="block rounded-xl border border-border/70 bg-card p-5 shadow-sm hover:border-border transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-base truncate">
                        {client.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {client.primary_contact_name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <ClientStatusBadge status={client.status} />
                      {client.project_manager ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                          PM: {client.project_manager.first_name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-medium">No PM</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex flex-col space-y-1.5 text-xs text-muted-foreground">
                    {client.project_manager && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-muted-foreground">PM:</span>
                        <span className="font-medium text-foreground">
                          {client.project_manager.first_name} {client.project_manager.last_name || ""}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{client.primary_contact_email}</span>
                    </div>
                    {client.primary_contact_phone && (
                      <div className="flex items-center gap-2 font-mono">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{client.primary_contact_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 pt-1 font-mono">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Created {formatDate(client.created_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
