"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  X,
  AlertCircle,
  Check,
  ChevronDown,
  UserX,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrbitAvatar } from "@/components/ui/orbit-avatar";
import { assignClientProjectManagerAction } from "../actions";
import type { TeamMember } from "../types";

interface AssignPmDialogProps {
  clientId: string;
  clientName: string;
  currentPm: TeamMember | null;
  projectManagers: TeamMember[];
  trigger?: React.ReactNode;
}

export function formatPmRoleAndDepartment(pm: TeamMember): string {
  const roleMap: Record<string, string> = {
    PROJECT_MANAGER: "Project Manager",
    DEVELOPER: "Developer",
    DESIGNER: "Designer",
    CONTENT: "Content Specialist",
    MARKETING: "Marketing Lead",
    SALES: "Sales & Partnerships",
    OTHER: pm.role === "SUPER_ADMIN" ? "Executive / General" : "Team Member",
  };

  const roleLabel =
    roleMap[pm.job_role] ||
    (pm.role === "SUPER_ADMIN" ? "Executive / General" : "Team Member");

  const dept = pm.department || (pm.role === "SUPER_ADMIN" ? "Admin" : null);

  if (dept) {
    return `${roleLabel} · ${dept}`;
  }
  return roleLabel;
}

export function AssignPmDialog({
  clientId,
  clientName,
  currentPm,
  projectManagers,
  trigger,
}: AssignPmDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [selectedPmId, setSelectedPmId] = React.useState<string>(
    currentPm?.id || ""
  );
  const [note, setNote] = React.useState("");
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [searchFilter, setSearchFilter] = React.useState("");

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setSelectedPmId(currentPm?.id || "");
    setIsConfirming(false);
    setIsDropdownOpen(false);
    setSearchFilter("");
  }, [currentPm, isOpen]);

  // Click outside to close custom dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  function handleOpen() {
    setSelectedPmId(currentPm?.id || "");
    setNote("");
    setErrorMessage(null);
    setIsConfirming(false);
    setIsDropdownOpen(false);
    setSearchFilter("");
    setIsOpen(true);
  }

  function handleClose() {
    if (isLoading) return;
    setIsOpen(false);
    setIsConfirming(false);
  }

  const selectedPm = React.useMemo(() => {
    return projectManagers.find((pm) => pm.id === selectedPmId) || null;
  }, [projectManagers, selectedPmId]);

  const filteredPms = React.useMemo(() => {
    if (!searchFilter.trim()) return projectManagers;
    const q = searchFilter.toLowerCase().trim();
    return projectManagers.filter((pm) => {
      const name = `${pm.first_name} ${pm.last_name || ""}`.toLowerCase();
      const role = formatPmRoleAndDepartment(pm).toLowerCase();
      const email = pm.email.toLowerCase();
      return name.includes(q) || role.includes(q) || email.includes(q);
    });
  }, [projectManagers, searchFilter]);

  const isChanging = currentPm && selectedPmId && currentPm.id !== selectedPmId;
  const isRemoving = currentPm && selectedPmId === "";

  async function handleProceed(e: React.FormEvent) {
    e.preventDefault();
    if (!isConfirming && (isChanging || isRemoving)) {
      setIsConfirming(true);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await assignClientProjectManagerAction(
      clientId,
      selectedPmId ? selectedPmId : null,
      note ? note : null
    );

    if (!result.success) {
      setErrorMessage(result.error || "Failed to update Project Manager.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      {trigger ? (
        <div onClick={handleOpen}>{trigger}</div>
      ) : (
        <Button
          onClick={handleOpen}
          size="sm"
          variant="outline"
          className="h-8 text-xs px-3 gap-1.5 border-border/80 hover:bg-secondary cursor-pointer"
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>{currentPm ? "Change PM" : "Assign PM"}</span>
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl z-10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {currentPm ? "Change Project Manager" : "Assign Project Manager"}
                  </h3>
                  <p className="text-xs text-muted-foreground">{clientName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Confirmation Screen */}
            {isConfirming ? (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <AlertCircle className="h-4 w-4" />
                    <span>Confirm PM Reassignment</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {isRemoving ? (
                      <>
                        Are you sure you want to remove{" "}
                        <strong className="text-foreground">
                          {currentPm?.first_name} {currentPm?.last_name || ""}
                        </strong>{" "}
                        as the Project Manager for <strong>{clientName}</strong>?
                      </>
                    ) : (
                      <>
                        This will assign{" "}
                        <strong className="text-foreground">
                          {selectedPm?.first_name} {selectedPm?.last_name || ""}
                        </strong>{" "}
                        as the primary Project Manager for <strong>{clientName}</strong>,
                        replacing{" "}
                        <span className="text-muted-foreground">
                          {currentPm?.first_name} {currentPm?.last_name || ""}
                        </span>
                        .
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsConfirming(false)}
                    disabled={isLoading}
                    className="h-8 text-xs px-3 cursor-pointer"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleProceed}
                    disabled={isLoading}
                    className="h-8 text-xs px-4 font-semibold shadow-sm cursor-pointer"
                  >
                    {isLoading ? "Saving..." : "Confirm Reassignment"}
                  </Button>
                </div>
              </div>
            ) : (
              /* Selection Form */
              <form onSubmit={handleProceed} className="space-y-4">
                <div className="space-y-1.5" ref={dropdownRef}>
                  <Label htmlFor="pm_select" className="text-xs font-medium">
                    Primary Project Manager *
                  </Label>

                  {/* Custom Rich Select Trigger */}
                  <div className="relative">
                    <button
                      id="pm_select"
                      type="button"
                      onClick={() => setIsDropdownOpen((prev) => !prev)}
                      disabled={isLoading}
                      className="w-full min-h-11 px-3 py-2 text-left rounded-xl border border-input bg-background hover:bg-secondary/40 transition-colors flex items-center justify-between gap-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    >
                      {selectedPm ? (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <OrbitAvatar
                            src={selectedPm.avatar_url}
                            name={`${selectedPm.first_name} ${selectedPm.last_name || ""}`}
                            size="sm"
                            className="shrink-0"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-semibold text-foreground truncate">
                              {selectedPm.first_name} {selectedPm.last_name || ""}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {formatPmRoleAndDepartment(selectedPm)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <UserX className="h-4 w-4" />
                          <span>-- No Project Manager assigned --</span>
                        </div>
                      )}

                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu Panel */}
                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                        {/* Search in dropdown if more than 3 PMs */}
                        {projectManagers.length > 3 && (
                          <div className="p-2 border-b border-border/60 bg-muted/30">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                              <input
                                type="text"
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                placeholder="Search PMs by name, role, department..."
                                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-border/60 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
                                autoFocus
                              />
                            </div>
                          </div>
                        )}

                        <div className="max-h-64 overflow-y-auto divide-y divide-border/40 p-1">
                          {/* Unassigned Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPmId("");
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full p-2.5 rounded-lg text-left text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                              selectedPmId === ""
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/50 shrink-0">
                                <UserX className="h-3.5 w-3.5" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-semibold">No Project Manager</div>
                                <div className="text-[10px] text-muted-foreground">
                                  Leave unassigned
                                </div>
                              </div>
                            </div>
                            {selectedPmId === "" && <Check className="h-4 w-4 shrink-0" />}
                          </button>

                          {/* PM Options List */}
                          {filteredPms.map((pm) => {
                            const isSelected = pm.id === selectedPmId;
                            return (
                              <button
                                key={pm.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPmId(pm.id);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full p-2.5 rounded-lg text-left text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-primary/10 text-foreground"
                                    : "hover:bg-secondary/60 text-foreground"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <OrbitAvatar
                                    src={pm.avatar_url}
                                    name={`${pm.first_name} ${pm.last_name || ""}`}
                                    size="sm"
                                    className="shrink-0"
                                  />
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="font-semibold truncate flex items-center gap-1.5">
                                      <span>
                                        {pm.first_name} {pm.last_name || ""}
                                      </span>
                                      {pm.role === "SUPER_ADMIN" && (
                                        <span className="text-[9px] font-mono px-1 py-0 rounded bg-primary/15 text-primary border border-primary/25">
                                          Admin
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground truncate font-normal">
                                      {formatPmRoleAndDepartment(pm)}
                                    </div>
                                  </div>
                                </div>

                                {isSelected && (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </button>
                            );
                          })}

                          {filteredPms.length === 0 && (
                            <div className="py-4 text-center text-xs text-muted-foreground">
                              No eligible Project Managers found matching &quot;{searchFilter}&quot;.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground pt-1">
                    Eligible Project Managers with active status are selectable.
                  </p>
                </div>

                {/* Selected PM Preview Card */}
                {selectedPm && (
                  <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <OrbitAvatar
                        src={selectedPm.avatar_url}
                        name={`${selectedPm.first_name} ${selectedPm.last_name || ""}`}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-semibold text-foreground truncate">
                          {selectedPm.first_name} {selectedPm.last_name || ""}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {formatPmRoleAndDepartment(selectedPm)}
                        </div>
                        <div className="text-[10px] text-muted-foreground/80 truncate font-mono">
                          {selectedPm.email}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                      Eligible PM
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="h-8 text-xs px-3 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      isLoading ||
                      (currentPm?.id === selectedPmId && selectedPmId !== "") ||
                      (!currentPm && selectedPmId === "")
                    }
                    className="h-8 text-xs px-4 font-semibold shadow-sm cursor-pointer"
                  >
                    {isLoading
                      ? "Saving..."
                      : isChanging || isRemoving
                      ? "Continue →"
                      : "Assign PM"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
