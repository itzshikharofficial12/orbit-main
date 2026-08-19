"use client";

import * as React from "react";
import { Volume2, VolumeX } from "lucide-react";

interface NotificationSoundToggleProps {
  isSoundEnabled: boolean;
  onToggle: () => void;
}

export function NotificationSoundToggle({
  isSoundEnabled,
  onToggle,
}: NotificationSoundToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={isSoundEnabled ? "Notification sound: ON" : "Notification sound: OFF"}
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
      aria-label={isSoundEnabled ? "Disable notification sound" : "Enable notification sound"}
    >
      {isSoundEnabled ? (
        <Volume2 className="h-3.5 w-3.5" />
      ) : (
        <VolumeX className="h-3.5 w-3.5 opacity-60" />
      )}
    </button>
  );
}
