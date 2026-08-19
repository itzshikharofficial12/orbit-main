/**
 * Utilities for formatting meeting dates, times, and duration in Orbit.
 */

export function formatMeetingDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function formatMeetingTimeRange(startsAtIso: string, endsAtIso: string): string {
  try {
    const start = new Date(startsAtIso);
    const end = new Date(endsAtIso);

    const startTimeStr = start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const endTimeStr = end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${startTimeStr} – ${endTimeStr}`;
  } catch {
    return `${startsAtIso} – ${endsAtIso}`;
  }
}

export function calculateMeetingDuration(startsAtIso: string, endsAtIso: string): string {
  try {
    const start = new Date(startsAtIso).getTime();
    const end = new Date(endsAtIso).getTime();
    const diffMins = Math.round((end - start) / (1000 * 60));

    if (diffMins <= 0) return "0 mins";
    if (diffMins < 60) return `${diffMins} mins`;

    const hrs = Math.floor(diffMins / 60);
    const remainderMins = diffMins % 60;

    if (remainderMins === 0) {
      return `${hrs} ${hrs === 1 ? "hr" : "hrs"}`;
    }

    return `${hrs} ${hrs === 1 ? "hr" : "hrs"} ${remainderMins} mins`;
  } catch {
    return "—";
  }
}

export function formatMeetingCompactDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${day} ${month} · ${time}`;
  } catch {
    return isoString;
  }
}
