"use client";

import * as React from "react";
import { Plus, X, Video, Calendar as CalendarIcon, Clock, Link as LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createMeetingAction } from "../actions";
import type { Client, Project } from "@/lib/supabase/types";

interface AddMeetingDialogProps {
  clients: Client[];
  projects: Project[];
}

export function AddMeetingDialog({ clients, projects }: AddMeetingDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = React.useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");

  // Auto-select first client if available
  React.useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  // Filter projects by selected client
  const clientProjects = React.useMemo(() => {
    if (!selectedClientId) return [];
    return projects.filter((p) => p.client_id === selectedClientId);
  }, [projects, selectedClientId]);

  // Reset project if client changes and current project doesn't belong to it
  React.useEffect(() => {
    if (selectedProjectId) {
      const belongs = clientProjects.some((p) => p.id === selectedProjectId);
      if (!belongs) {
        setSelectedProjectId("");
      }
    }
  }, [clientProjects, selectedProjectId]);

  // Default date to today
  const todayStr = React.useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);

  function handleOpen() {
    setErrorMessage(null);
    setIsOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setIsOpen(false);
    setErrorMessage(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("client_id", selectedClientId);
    if (selectedProjectId) {
      formData.set("project_id", selectedProjectId);
    } else {
      formData.delete("project_id");
    }

    startTransition(async () => {
      const result = await createMeetingAction(formData);
      if (result.success) {
        setIsOpen(false);
      } else {
        setErrorMessage(result.error || "Failed to schedule meeting");
      }
    });
  }

  return (
    <>
      <Button onClick={handleOpen} className="h-9 gap-1.5 text-xs font-medium cursor-pointer">
        <Plus className="h-3.5 w-3.5" />
        <span>Schedule Meeting</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          {/* Modal Container */}
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="space-y-0.5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <span>Schedule Client Meeting</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Create a scheduled meeting with meeting link and notify client stakeholders.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/30 leading-relaxed font-mono">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label htmlFor="meeting-title" className="text-xs font-medium text-foreground">
                  Meeting Title <span className="text-destructive">*</span>
                </label>
                <input
                  id="meeting-title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Website Strategy Review, Sprint Sync"
                  className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Client & Project Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="meeting-client" className="text-xs font-medium text-foreground">
                    Client <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="meeting-client"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="" disabled>
                      Select client...
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="meeting-project" className="text-xs font-medium text-foreground">
                    Project <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <select
                    id="meeting-project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">General Account Meeting</option>
                    {clientProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="meeting-date" className="text-xs font-medium text-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                    <span>Date *</span>
                  </label>
                  <input
                    id="meeting-date"
                    name="date"
                    type="date"
                    required
                    defaultValue={todayStr}
                    className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="meeting-start-time" className="text-xs font-medium text-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>Start Time *</span>
                  </label>
                  <input
                    id="meeting-start-time"
                    name="start_time"
                    type="time"
                    required
                    defaultValue="16:00"
                    className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="meeting-end-time" className="text-xs font-medium text-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>End Time *</span>
                  </label>
                  <input
                    id="meeting-end-time"
                    name="end_time"
                    type="time"
                    required
                    defaultValue="16:45"
                    className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Meeting URL */}
              <div className="space-y-1.5">
                <label htmlFor="meeting-url" className="text-xs font-medium text-foreground flex items-center gap-1">
                  <LinkIcon className="h-3 w-3 text-muted-foreground" />
                  <span>Meeting Link URL *</span>
                </label>
                <input
                  id="meeting-url"
                  name="meeting_url"
                  type="url"
                  required
                  placeholder="https://meet.google.com/abc-defg-hij or https://zoom.us/j/..."
                  className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="meeting-description" className="text-xs font-medium text-foreground">
                  Agenda / Notes <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <textarea
                  id="meeting-description"
                  name="description"
                  rows={3}
                  placeholder="Key topics to discuss, deliverables to review, or preparation items..."
                  className="w-full p-2.5 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={isPending}
                  className="text-xs h-8 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="text-xs h-8 gap-1.5 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Schedule Meeting</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
