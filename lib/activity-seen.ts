// "Seen" high-water mark for the Activities feed, per viewer, per browser.
//
// Slack's unread model: the badge counts what arrived since you last looked,
// and looking clears it. The mark lives in localStorage because it is a
// per-viewer convenience, not shared state — a second device simply has its
// own idea of "last looked", which is the same trade-off Slack makes before
// it syncs read state. Every access is guarded: strict privacy modes throw
// on localStorage rather than returning null (see lib/supabase.ts).

const KEY_PREFIX = 'pgi-activities-seen:';
const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export const ACTIVITIES_SEEN_EVENT = 'pgi:activities-seen';

export function getActivitiesSeenAt(userId: string | null | undefined): string {
  if (typeof window !== 'undefined' && userId) {
    try {
      const stored = window.localStorage.getItem(KEY_PREFIX + userId);
      if (stored && !Number.isNaN(Date.parse(stored))) return stored;
    } catch {
      /* fall through to the default */
    }
  }
  // First visit on this browser: treat the last day as unseen rather than
  // the whole history, so the badge is informative instead of a wall.
  return new Date(Date.now() - DEFAULT_LOOKBACK_MS).toISOString();
}

export function markActivitiesSeen(userId: string | null | undefined): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(KEY_PREFIX + userId, new Date().toISOString());
  } catch {
    /* nothing to do: the badge just keeps counting from the default */
  }
  window.dispatchEvent(new Event(ACTIVITIES_SEEN_EVENT));
}
