"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ChevronRight, Building2, Mail, Phone, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClientStatusBadge } from "./client-status-badge";
import type { Client, ClientStatus } from "../types";
import { cn } from "@/lib/utils";

interface ClientListProps {
  initialClients: Client[];
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
        return matchesName || matchesContact || matchesEmail;
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
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                selectedStatus === tab.id
                  ? "bg-secondary text-foreground font-semibold border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "text-[11px] px-1.5 py-0.2 rounded-full font-mono",
                  selectedStatus === tab.id
                    ? "bg-card text-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-card/40"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <div className="rounded-xl border border-border/60 bg-card/30 p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="rounded-full bg-secondary/60 p-3.5 text-muted-foreground border border-border/40">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium text-foreground">
                {searchQuery || selectedStatus !== "ALL"
                  ? "No matching clients"
                  : "No clients registered"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery || selectedStatus !== "ALL"
                  ? "Try adjusting your search query or status filter to find the client record."
                  : "Create your first client account in Orbit to start managing Celestia Studios engagements."}
              </p>
            </div>
            {(searchQuery || selectedStatus !== "ALL") && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("ALL");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Desktop Table View (Hidden on mobile) */}
      {filteredClients.length > 0 && (
        <>
          <div className="hidden md:block rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30 text-[11px] font-medium uppercase tracking-wider text-muted-foreground font-mono">
                  <th className="py-3 px-5">Client</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Primary Contact</th>
                  <th className="py-3 px-5">Created</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-accent/40 transition-colors group cursor-pointer"
                    onClick={() => {
                      window.location.href = `/hq/clients/${client.id}`;
                    }}
                  >
                    {/* Client Name & ID */}
                    <td className="py-4 px-5">
                      <div className="flex flex-col">
                        <Link
                          href={`/hq/clients/${client.id}`}
                          className="font-medium text-foreground group-hover:text-primary transition-colors inline-flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>{client.name}</span>
                        </Link>
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
                          <span className="mt-0.5">{client.primary_contact_phone}</span>
                        )}
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-5 text-xs text-muted-foreground whitespace-nowrap">
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
                className="block rounded-xl border border-border/70 bg-card p-5 shadow-xs hover:border-border transition-colors"
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
                  <ClientStatusBadge status={client.status} />
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 flex flex-col space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{client.primary_contact_email}</span>
                  </div>
                  {client.primary_contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{client.primary_contact_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 pt-1">
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
  );
}
