// Pure deck-building. No DB calls; the caller persists the result.

export type DeckInputPlayer = { id: string; name: string };
export type DeckInputAnswer = { player_id: string; q_index: number; text: string };

export type DeckCard = {
  player_id: string;
  q_index: number;
  position: number;
};

// Soft constraint: try to avoid two consecutive cards from the same player.
// Single swap pass — doesn't always succeed but improves the average without
// rejecting valid shuffles.
function decluster<T extends { player_id: string }>(cards: T[]): T[] {
  const out = [...cards];
  for (let i = 1; i < out.length; i++) {
    if (out[i].player_id !== out[i - 1].player_id) continue;
    for (let j = i + 1; j < out.length; j++) {
      const safeBefore = out[j].player_id !== out[i - 1].player_id;
      const safeAfter =
        j + 1 >= out.length || out[j + 1].player_id !== out[i].player_id;
      if (safeBefore && safeAfter) {
        [out[i], out[j]] = [out[j], out[i]];
        break;
      }
    }
  }
  return out;
}

export function buildDeck(
  players: DeckInputPlayer[],
  answers: DeckInputAnswer[],
): DeckCard[] {
  const validPlayerIds = new Set(players.map((p) => p.id));
  const submittedByPlayer = new Map<string, number>();

  for (const a of answers) {
    if (!validPlayerIds.has(a.player_id)) continue;
    if (a.text.trim().length === 0) continue;
    submittedByPlayer.set(
      a.player_id,
      (submittedByPlayer.get(a.player_id) ?? 0) + 1,
    );
  }

  // Only include players who submitted a complete set of answers.
  const eligible = new Set<string>();
  for (const [pid, count] of submittedByPlayer) {
    if (count >= 1) eligible.add(pid);
  }

  const candidates = answers
    .filter((a) => eligible.has(a.player_id) && a.text.trim().length > 0)
    .map((a) => ({ player_id: a.player_id, q_index: a.q_index }));

  // Fisher-Yates shuffle.
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const declustered = decluster(shuffled);

  return declustered.map((c, i) => ({ ...c, position: i }));
}
