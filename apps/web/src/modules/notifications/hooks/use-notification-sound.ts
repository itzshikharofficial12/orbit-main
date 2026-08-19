"use client";

import * as React from "react";

const SOUND_PREFERENCE_KEY = "orbit_notification_sound";

export function useNotificationSound() {
  const [isSoundEnabled, setIsSoundEnabled] = React.useState<boolean>(true);
  const audioContextRef = React.useRef<AudioContext | null>(null);

  // Initialize preference from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(SOUND_PREFERENCE_KEY);
      if (stored !== null) {
        setIsSoundEnabled(stored === "true");
      }
    } catch {
      // localStorage may not be available
    }
  }, []);

  const toggleSound = React.useCallback(() => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_PREFERENCE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  /**
   * Synthesize a subtle, premium 0.35s notification tone using Web Audio API.
   * Fails silently if autoplay restrictions or audio context is disabled.
   */
  const playSound = React.useCallback(() => {
    if (!isSoundEnabled) return;
    if (typeof window === "undefined") return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioCtx();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // Create subtle primary oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      // Soft envelope
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.02); // gentle attack
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35); // smooth decay

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // Fail silently without throwing
    }
  }, [isSoundEnabled]);

  return {
    isSoundEnabled,
    toggleSound,
    playSound,
  };
}
