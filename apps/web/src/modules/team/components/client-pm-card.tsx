"use client";

import * as React from "react";
import { UserCheck, Mail, Phone, AlertCircle, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrbitAvatar } from "@/components/ui/orbit-avatar";
import { AssignPmDialog, formatPmRoleAndDepartment } from "./assign-pm-dialog";
import type { TeamMember } from "../types";

interface ClientPmCardProps {
  clientId: string;
  clientName: string;
  currentPm: TeamMember | null;
  projectManagers: TeamMember[];
}

export function ClientPmCard({
  clientId,
  clientName,
  currentPm,
  projectManagers,
}: ClientPmCardProps) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold text-foreground">
            Project Manager
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Primary Celestia Studios lead responsible for delivery and client communication.
          </CardDescription>
        </div>

        {currentPm && (
          <AssignPmDialog
            clientId={clientId}
            clientName={clientName}
            currentPm={currentPm}
            projectManagers={projectManagers}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5 gap-1.5 border-border/80 hover:bg-secondary cursor-pointer"
              >
                <span>Change PM</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            }
          />
        )}
      </CardHeader>

      <CardContent className="pt-1">
        {currentPm ? (
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <OrbitAvatar
                  src={currentPm.avatar_url}
                  name={`${currentPm.first_name} ${currentPm.last_name || ""}`}
                  size="lg"
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {currentPm.first_name} {currentPm.last_name || ""}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {formatPmRoleAndDepartment(currentPm)} · Celestia Studios
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs font-mono shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Assigned</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex items-center gap-1.5 min-w-0">
                <Mail className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                <a
                  href={`mailto:${currentPm.email}`}
                  className="font-medium text-foreground hover:underline truncate"
                >
                  {currentPm.email}
                </a>
              </div>
              {currentPm.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                  <span className="font-mono text-foreground/90">{currentPm.phone}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 mx-auto border border-amber-500/20">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="text-xs font-semibold text-foreground">
                No Project Manager assigned
              </p>
              <p className="text-[11px] text-muted-foreground">
                Assign a dedicated Project Manager to lead client communication and project delivery.
              </p>
            </div>
            <div className="pt-1">
              <AssignPmDialog
                clientId={clientId}
                clientName={clientName}
                currentPm={null}
                projectManagers={projectManagers}
                trigger={
                  <Button
                    size="sm"
                    className="h-8 text-xs px-3.5 font-semibold gap-1.5 shadow-sm"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Assign Project Manager</span>
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
