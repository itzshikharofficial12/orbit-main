"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Mail,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GivePortalAccessDialog } from "./give-portal-access-dialog";
import { RemovePortalAccessDialog } from "./remove-portal-access-dialog";
import { sendClientPasswordResetAction } from "../actions";
import type { Client } from "../types";
import type { Profile } from "@/lib/supabase/types";

interface PortalAccessCardProps {
  client: Client;
  portalUsers: Profile[];
}

export function PortalAccessCard({ client, portalUsers }: PortalAccessCardProps) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const primaryUser = portalUsers[0] || null;

  async function handleSendPasswordReset(email: string) {
    setActionLoading("reset");
    setFeedback(null);
    const result = await sendClientPasswordResetAction(email, client.id);
    setActionLoading(null);

    if (result.success) {
      setFeedback({ type: "success", message: result.message || "Password reset email sent." });
    } else {
      setFeedback({ type: "error", message: result.error || "Failed to send reset email." });
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
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
    <Card className="border-border/70 bg-card">
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Portal Access</CardTitle>
            {primaryUser ? (
              <Badge variant="outline" className="text-xs font-normal border-emerald-800/60 text-emerald-400 bg-emerald-950/40">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                <span>Enabled</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-normal border-zinc-700 text-zinc-400 bg-zinc-900/60">
                <span>Not configured</span>
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Manage authenticated credentials and access for the Orbit Client Portal.
          </CardDescription>
        </div>

        {!primaryUser && (
          <GivePortalAccessDialog
            clientId={client.id}
            defaultEmail={client.primary_contact_email}
            defaultName={client.primary_contact_name}
          />
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {feedback && (
          <div
            className={`p-3 rounded-lg text-xs border ${
              feedback.type === "success"
                ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-300"
                : "border-red-900/60 bg-red-950/40 text-red-300"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {primaryUser ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 rounded-lg border border-border/60 bg-secondary/15 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-mono">User Name</span>
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{primaryUser.first_name} {primaryUser.last_name || ""}</span>
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-mono">Login Email</span>
                <span className="font-medium text-foreground flex items-center gap-1.5 truncate">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{primaryUser.email}</span>
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-mono">Provisioned Date</span>
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatDate(primaryUser.created_at)}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-muted-foreground">
                Client authentication is managed through Supabase Auth.
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading === "reset"}
                  onClick={() => handleSendPasswordReset(primaryUser.email)}
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{actionLoading === "reset" ? "Sending..." : "Send Password Reset"}</span>
                </Button>

                <RemovePortalAccessDialog
                  clientId={client.id}
                  clientName={client.name}
                  profileId={primaryUser.id}
                  userEmail={primaryUser.email}
                  userName={`${primaryUser.first_name} ${primaryUser.last_name || ""}`.trim()}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-dashed border-border/60 bg-secondary/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground">No client user connected</div>
                <div className="text-xs text-muted-foreground">
                  Give portal access to allow {client.name} to view their project dashboard, milestones, and deliverables.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
