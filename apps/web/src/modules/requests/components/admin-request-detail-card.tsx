"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FolderKanban,
  Package,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Play,
  HelpCircle,
  MessageSquare,
  Send,
  Loader2,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequestStatusBadge } from "./request-status-badge";
import { RequestPriorityBadge } from "./request-priority-badge";
import {
  getCategoryInfo,
  getStatusInfo,
  getPriorityInfo,
  formatRequestDate,
} from "../utils";
import {
  updateRequestStatusAction,
  updateRequestPriorityAction,
  sendRequestMessageAction,
} from "../actions";
import type {
  ClientRequestWithRelations,
  RequestStatus,
  ClientRequestPriority,
  RequestMessage,
} from "../types";

interface AdminRequestDetailCardProps {
  request: ClientRequestWithRelations;
}

export function AdminRequestDetailCard({ request }: AdminRequestDetailCardProps) {
  const router = useRouter();
  const [messages, setMessages] = React.useState<RequestMessage[]>(request.messages || []);
  const [replyText, setReplyText] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const catInfo = getCategoryInfo(request.category);
  const CategoryIcon = catInfo.icon;
  const refNumber = request.reference_number || `REQ-${request.id.slice(0, 4).toUpperCase()}`;

  async function handleStatusChange(newStatus: RequestStatus) {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await updateRequestStatusAction({
      requestId: request.id,
      status: newStatus,
    });

    if (!result.success) {
      setErrorMessage(result.error || "Failed to update request status.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    router.refresh();
  }

  async function handlePriorityChange(newPriority: ClientRequestPriority) {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await updateRequestPriorityAction({
      requestId: request.id,
      priority: newPriority,
    });

    if (!result.success) {
      setErrorMessage(result.error || "Failed to update priority.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    router.refresh();
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || isSending) return;

    try {
      setIsSending(true);
      setErrorMessage(null);

      const res = await sendRequestMessageAction({
        requestId: request.id,
        message: replyText.trim(),
      });

      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data!]);
        setReplyText("");
        setIsSending(false);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Failed to send message.");
        setIsSending(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reply failed";
      setErrorMessage(msg);
      setIsSending(false);
    }
  }

  const creatorName = request.created_by_profile
    ? `${request.created_by_profile.first_name || ""} ${
        request.created_by_profile.last_name || ""
      }`.trim() || request.created_by_profile.email
    : null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Button */}
      <div>
        <Link
          href="/hq/requests"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Request Directory</span>
        </Link>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Main Request Card */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded bg-secondary text-foreground border border-border/60">
                  {refNumber}
                </span>

                <span
                  className={`text-xs font-mono px-2.5 py-0.5 rounded border flex items-center gap-1.5 ${catInfo.colorClass}`}
                >
                  <CategoryIcon className="h-3 w-3" />
                  <span>{catInfo.label}</span>
                </span>

                <RequestStatusBadge status={request.status} />
                <RequestPriorityBadge priority={request.priority} />
              </div>

              <CardTitle className="text-xl font-bold tracking-tight text-foreground pt-1">
                {request.title}
              </CardTitle>
            </div>

            {/* Admin Action Buttons & Priority Select */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Priority Selector */}
              <select
                value={request.priority}
                onChange={(e) => handlePriorityChange(e.target.value as ClientRequestPriority)}
                disabled={isLoading}
                className="h-8 px-2 text-xs rounded border border-border/80 bg-background text-foreground focus:outline-none"
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Normal Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent Priority</option>
              </select>

              {/* Status Buttons */}
              {request.status !== "IN_PROGRESS" && request.status !== "RESOLVED" && request.status !== "CLOSED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                  disabled={isLoading}
                  className="h-8 text-xs font-medium gap-1.5 bg-blue-950/20 text-blue-300 border-blue-800/60 hover:bg-blue-950/40 cursor-pointer"
                >
                  <Play className="h-3 w-3" />
                  <span>In Progress</span>
                </Button>
              )}

              {request.status !== "WAITING_FOR_CLIENT" && request.status !== "RESOLVED" && request.status !== "CLOSED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("WAITING_FOR_CLIENT")}
                  disabled={isLoading}
                  className="h-8 text-xs font-medium gap-1.5 bg-amber-950/20 text-amber-300 border-amber-800/60 hover:bg-amber-950/40 cursor-pointer"
                >
                  <HelpCircle className="h-3 w-3" />
                  <span>Waiting on Client</span>
                </Button>
              )}

              {request.status !== "RESOLVED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("RESOLVED")}
                  disabled={isLoading}
                  className="h-8 text-xs font-medium gap-1.5 bg-emerald-950/20 text-emerald-300 border-emerald-800/60 hover:bg-emerald-950/40 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Resolve</span>
                </Button>
              )}

              {request.status !== "CLOSED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("CLOSED")}
                  disabled={isLoading}
                  className="h-8 text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground border-border/70 cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Close</span>
                </Button>
              )}

              {(request.status === "CLOSED" || request.status === "RESOLVED") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("OPEN")}
                  disabled={isLoading}
                  className="h-8 text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground border-border/70 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reopen</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-secondary/20 border border-border/50 text-xs">
            {/* Client */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Client Organization
              </span>
              {request.client ? (
                <Link
                  href={`/hq/clients/${request.client_id}`}
                  className="font-medium text-foreground hover:underline inline-flex items-center gap-1.5"
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{request.client.name}</span>
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            {/* Project */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Project Engagement
              </span>
              {request.project ? (
                <Link
                  href={`/hq/projects/${request.project_id}`}
                  className="font-medium text-foreground hover:underline inline-flex items-center gap-1.5"
                >
                  <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{request.project.name}</span>
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            {/* Deliverable / Resource */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Linked Deliverable
              </span>
              {request.deliverable ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/hq/projects/${request.project_id}?tab=deliverables`}
                    className="font-medium text-foreground hover:underline inline-flex items-center gap-1.5 truncate"
                  >
                    <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{request.deliverable.title}</span>
                  </Link>
                  {request.deliverable.url && (
                    <a
                      href={request.deliverable.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>

          {/* Original Message Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Original Message from Client
            </h3>
            <div className="p-4 rounded-xl bg-secondary/15 border border-border/50 text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
              {request.description}
            </div>
            {creatorName && (
              <span className="text-[11px] font-mono text-muted-foreground block px-1">
                Submitted by {creatorName} on {formatRequestDate(request.created_at)}
              </span>
            )}
          </div>

          {/* Conversation Thread */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-semibold">
                Conversation Thread ({messages.length})
              </h3>
            </div>

            {messages.length === 0 ? (
              <div className="p-6 rounded-lg border border-dashed border-border/60 bg-secondary/10 text-center text-xs text-muted-foreground">
                No replies in this thread yet. Write a response below.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isAdmin = msg.sender?.role === "SUPER_ADMIN";
                  const senderName = isAdmin
                    ? "Celestia Operations"
                    : `${msg.sender?.first_name || "Client"} ${msg.sender?.last_name || ""}`.trim();

                  return (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-xl border space-y-1.5 ${
                        isAdmin
                          ? "bg-primary/5 border-primary/30 ml-4 sm:ml-8"
                          : "bg-secondary/30 border-border/60 mr-4 sm:mr-8"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{senderName}</span>
                          {isAdmin ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-primary/20 text-primary font-semibold">
                              Admin
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">
                              Client
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {formatRequestDate(msg.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed pt-1">
                        {msg.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin Reply Composer */}
          <div className="p-4 rounded-xl border border-border/70 bg-secondary/10 space-y-3">
            <h4 className="text-xs font-semibold text-foreground">
              Send Response to Client
            </h4>

            <form onSubmit={handleSendReply} className="space-y-3">
              <Textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write response message to client..."
                className="text-xs bg-background resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Client will receive an instant notification
                </span>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSending || !replyText.trim()}
                  className="h-8 text-xs px-3.5 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>{isSending ? "Sending..." : "Send Response"}</span>
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
