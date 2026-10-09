/** Visitor assistant conversations, saved per browser. Messages use the AI SDK UIMessage shape. */
export interface AskThread { id: string; title: string; updatedAt: number; messages: unknown[] }
export const ASK_THREADS_KEY = 'islington-tennis:ask-threads';
export const ASK_ROUTE = /^#\/ask(?:\/([\w-]+))?$/;

export function parseThreads(raw: string | null): AskThread[] {
  try {
    const value = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((t): t is AskThread => !!t && typeof t.id === 'string' && typeof t.title === 'string' && Array.isArray(t.messages))
      .map(t => ({ ...t, updatedAt: Number(t.updatedAt) || 0 }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch { return []; }
}

export function threadTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'New question';
  return clean.length > 42 ? `${clean.slice(0, 41)}…` : clean;
}

export function threadIdFromHash(hash: string): string | null | undefined {
  const match = ASK_ROUTE.exec(hash);
  if (!match) return undefined; // assistant closed
  return match[1] ?? null; // open, no thread chosen
}
