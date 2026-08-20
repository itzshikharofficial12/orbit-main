"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  User,
  FolderKanban,
  FileCheck,
  CreditCard,
  Video,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getCategoryInfo,
  getStatusInfo,
  getPriorityInfo,
  formatRequestDate,
} from "../utils";
import { sendRequestMessageAction, reopenRequestAction } from "../actions";
import type { ClientRequestWithRelations, RequestMessage } from "../types";

interface ClientRequestDetailViewProps {
  request: ClientRequestWithRelations;
}

export function ClientRequestDetailView({
  request,
}: ClientRequestDetailViewProps) {
  const router = useRouter();
  const [messages, setMessages] = React.useState<RequestMessage[]>(request.messages || []);
  const [replyText, setReplyText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isReopening, setIsReopening] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const catInfo = getCategoryInfo(request.category);
  const statInfo = getStatusInfo(request.status);
  const prioInfo = getPriorityInfo(request.priority);
  const CategoryIcon = catInfo.icon;
  const refNumber = request.reference_number || `REQ-${request.id.slice(0, 4).toUpperCase()}`;

  const isResolved = request.status === "RESOLVED" || request.status === "CLOSED";

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await sendRequestMessageAction({
        requestId: request.id,
        message: replyText.trim(),
      });

      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data!]);
        setReplyText("");
        setIsSubmitting(false);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to send message.");
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reply failed";
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (isReopening) return;
    try {
      setIsReopening(true);
      setErrorMsg(null);
      const res = await reopenRequestAction(request.id);
      if (res.success) {
        setIsReopening(false);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to reopen request.");
        setIsReopening(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error reopening request";
      setErrorMsg(msg);
      setIsReopening(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Top Action Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/40">
        <Link
          href="/client/requests"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Requests</span>
        </Link>

        <div className="flex items-center gap-2">
          {isResolved && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReopen}
              disabled={isReopening}
              className="h-8 text-xs gap-1.5 border-border/80 hover:bg-secondary"
            >
              {isReopening ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              <span>Reopen Request</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Request Header Card */}
      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <div className="space-y-2">
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

            <span
              className={`text-xs font-mono px-2.5 py-0.5 rounded border ${statInfo.colorClass}`}
            >
              {statInfo.label}
            </span>

            {request.priority === "HIGH" && (
              <span
                className={`text-xs font-mono px-2.5 py-0.5 rounded border ${prioInfo.colorClass}`}
              >
                High Priority
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {request.title}
          </h1>

          {/* Context Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono pt-1">
            {request.project && (
              <div className="flex items-center gap-1.5">
                <FolderKanban className="h-3.5 w-3.5 text-muted-foreground/70" />
                <span>Project:</span>
                <Link
                  href={`/client/projects/${request.project.id}`}
                  className="text-foreground hover:underline font-sans"
                >
                  {request.project.name}
                </Link>
              </div>
            )}

            {request.deliverable && (
              <div className="flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-muted-foreground/70" />
                <span>Deliverable:</span>
                <span className="text-foreground font-sans">{request.deliverable.title}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span>Submitted {formatRequestDate(request.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Original Description Card */}
        <div className="p-4 rounded-lg bg-secondary/30 border border-border/60 space-y-1.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block font-semibold">
            Original Request
          </span>
          <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {request.description}
          </p>
        </div>
      </div>

      {/* 3. Resolution Banner if Resolved */}
      {isResolved && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <h4 className="font-semibold text-emerald-400">Request Resolved</h4>
            <p className="text-muted-foreground">
              This request has been resolved by Celestia Studios. If you need further assistance with this topic, you can send a reply below to reopen it.
            </p>
          </div>
        </div>
      )}

      {/* 4. Conversation Thread */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Conversation History ({messages.length})
          </h3>
        </div>

        {messages.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border/80 bg-card/30 text-center text-xs text-muted-foreground">
            No replies yet. Celestia Studios will respond here shortly.
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isAdmin = msg.sender?.role === "SUPER_ADMIN";
              const senderDisplayName = isAdmin
                ? "Celestia Studios Team"
                : `${msg.sender?.first_name || "Client"} ${msg.sender?.last_name || ""}`.trim();

              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-xl border space-y-2 transition-colors ${
                    isAdmin
                      ? "bg-primary/5 border-primary/25 ml-2 sm:ml-6"
                      : "bg-card border-border/70 mr-2 sm:mr-6"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                          isAdmin
                            ? "bg-primary/20 text-primary border border-primary/40"
                            : "bg-secondary text-foreground border border-border/60"
                        }`}
                      >
                        {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <User className="h-3 w-3" />}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground">
                          {senderDisplayName}
                        </span>
                        {isAdmin && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-primary/20 text-primary font-semibold">
                            Celestia HQ
                          </span>
                        )}
                      </div>
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

      {/* 5. Reply Composer */}
      <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-3">
        <h4 className="text-xs font-semibold text-foreground">
          {isResolved ? "Send a reply to reopen this request" : "Write a reply"}
        </h4>

        {errorMsg && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSendReply} className="space-y-3">
          <Textarea
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a message to Celestia Studios team..."
            className="text-xs bg-background resize-none"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground font-mono">
              Press Send to dispatch notification to Celestia HQ
            </span>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !replyText.trim()}
              className="h-8 text-xs px-3.5 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>{isSubmitting ? "Sending..." : "Send Reply"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
