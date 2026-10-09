export const LEVELS = ['Beginner', 'Improver', 'Intermediate', 'Advanced', 'Competitive'] as const;
export type Level = typeof LEVELS[number];
export interface PlayerProfile {
  display_name: string; level: Level | string; utr_rating: number | null;
  preferred_courts: string[]; contact: string; visible: boolean;
}

/** Returns a friendly error, or null when the player card is valid. */
export function validateProfile(p: PlayerProfile): string | null {
  const name = p.display_name.trim();
  if (!name) return 'Please add your name.';
  if (name.length > 60) return 'Please keep your name under 60 characters.';
  if (!LEVELS.includes(p.level as Level)) return 'Please choose a level.';
  if (p.utr_rating !== null && (!Number.isFinite(p.utr_rating) || p.utr_rating < 1 || p.utr_rating > 16.5)) return 'UTR ratings run from 1 to 16.5.';
  if (p.contact.trim().length > 120) return 'Please keep contact details under 120 characters.';
  return null;
}
