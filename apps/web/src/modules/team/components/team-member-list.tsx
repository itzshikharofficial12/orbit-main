"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Users,
  Shield,
  Briefcase,
  Code,
  Palette,
  CheckCircle2,
  XCircle,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AddTeamMemberDialog } from "./add-team-member-dialog";
import { EditTeamMemberDialog } from "./edit-team-member-dialog";
import type { TeamMember, TeamStats, EmployeeJobRole, EmployeeStatus } from "../types";

interface TeamMemberListProps {
  initialMembers: TeamMember[];
  stats: TeamStats;
}

export function TeamMemberList({
  initialMembers,
  stats,
}: TeamMemberListProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  const filteredMembers = React.useMemo(() => {
    return initialMembers.filter((m) => {
      // Role filter
      if (roleFilter !== "ALL" && m.job_role !== roleFilter) return false;

      // Status filter
      if (statusFilter !== "ALL" && m.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${m.first_name} ${m.last_name || ""}`.toLowerCase();
        return (
          fullName.includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.phone && m.phone.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [initialMembers, searchQuery, roleFilter, statusFilter]);

  function getJobRoleBadge(role: EmployeeJobRole) {
    switch (role) {
      case "PROJECT_MANAGER":
        return (
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/10 text-primary font-medium text-[11px] px-2 py-0.5"
          >
            Project Manager
          </Badge>
        );
      case "DEVELOPER":
        return (
          <Badge
            variant="outline"
            className="border-blue-500/40 bg-blue-500/10 text-blue-400 font-medium text-[11px] px-2 py-0.5"
          >
            Developer
          </Badge>
        );
      case "DESIGNER":
        return (
          <Badge
            variant="outline"
            className="border-purple-500/40 bg-purple-500/10 text-purple-400 font-medium text-[11px] px-2 py-0.5"
          >
            Designer
          </Badge>
        );
      case "CONTENT":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-400 font-medium text-[11px] px-2 py-0.5"
          >
            Content
          </Badge>
        );
      case "MARKETING":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-medium text-[11px] px-2 py-0.5"
          >
            Marketing
          </Badge>
        );
      case "SALES":
        return (
          <Badge
            variant="outline"
            className="border-cyan-500/40 bg-cyan-500/10 text-cyan-400 font-medium text-[11px] px-2 py-0.5"
          >
            Sales
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-border bg-secondary text-muted-foreground font-medium text-[11px] px-2 py-0.5"
          >
            Other
          </Badge>
        );
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Team</h1>
          <p className="text-xs text-muted-foreground">
            Manage the Celestia Studios team and client responsibilities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <AddTeamMemberDialog />
        </div>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Total Team
            </span>
            <Users className="h-4 w-4 text-muted-foreground/70" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">{stats.total}</div>
          <p className="text-[11px] text-muted-foreground">{stats.active} active members</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Project Managers
            </span>
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {stats.project_managers}
          </div>
          <p className="text-[11px] text-muted-foreground">Client leadership</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Developers & Designers
            </span>
            <Code className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {stats.developers + stats.designers}
          </div>
          <p className="text-[11px] text-muted-foreground">Delivery team</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Other Roles
            </span>
            <Palette className="h-4 w-4 text-muted-foreground/70" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">{stats.other}</div>
          <p className="text-[11px] text-muted-foreground">Content, Sales & Marketing</p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl bg-card border border-border/70 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="pl-8 h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="flex items-center gap-2 px-1">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-lg border border-border/70 bg-secondary/60 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Job Roles</option>
            <option value="PROJECT_MANAGER">Project Manager</option>
            <option value="DEVELOPER">Developer</option>
            <option value="DESIGNER">Designer</option>
            <option value="CONTENT">Content</option>
            <option value="MARKETING">Marketing</option>
            <option value="SALES">Sales</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-lg border border-border/70 bg-secondary/60 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* 4. Team Members Directory Table */}
      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm">
        {filteredMembers.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground mx-auto">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="text-sm font-semibold text-foreground">No team members found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery || roleFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Try adjusting your search or filters."
                  : "Add your first team member to begin assigning client responsibilities."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30 text-[11px] font-medium uppercase tracking-wider text-muted-foreground font-mono">
                  <th className="py-3 px-5">Team Member</th>
                  <th className="py-3 px-5">Job Role</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Assigned Clients</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredMembers.map((member) => {
                  const initial = member.first_name[0]?.toUpperCase() || "T";
                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-secondary/20 transition-colors group"
                    >
                      {/* Name & Contact */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20 shrink-0">
                            {initial}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground truncate text-sm">
                                {member.first_name} {member.last_name || ""}
                              </span>
                              {member.role === "SUPER_ADMIN" && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-mono px-1.5 py-0 border-border text-muted-foreground"
                                >
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                              <span className="truncate">{member.email}</span>
                              {member.phone && (
                                <span className="hidden sm:inline font-mono">
                                  · {member.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Job Role */}
                      <td className="py-4 px-5">{getJobRoleBadge(member.job_role)}</td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        {member.status === "ACTIVE" ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                            <span>Inactive</span>
                          </div>
                        )}
                      </td>

                      {/* Assigned Clients */}
                      <td className="py-4 px-5">
                        {member.assigned_clients && member.assigned_clients.length > 0 ? (
                          <div className="space-y-1">
                            <span className="font-mono font-medium text-foreground text-xs">
                              {member.assigned_clients.length}{" "}
                              {member.assigned_clients.length === 1 ? "client" : "clients"}
                            </span>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {member.assigned_clients.slice(0, 3).map((client) => (
                                <Link
                                  key={client.id}
                                  href={`/hq/clients/${client.id}`}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/40 transition-colors"
                                >
                                  {client.name}
                                </Link>
                              ))}
                              {member.assigned_clients.length > 3 && (
                                <span className="text-[10px] text-muted-foreground self-center">
                                  +{member.assigned_clients.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">0 clients</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <EditTeamMemberDialog member={member} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
