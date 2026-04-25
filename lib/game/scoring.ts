type Player = { id: string; name: string };
type Card = { id: string; player_id: string };
type Guess = { card_id: string; guesser_id: string; guessed_player_id: string };

export type Score = {
  player: Player;
  correct: number;
  attempts: number;
  rank: number;     // 1-based; tied players share a rank
  tied: boolean;    // true when at least one other player shares this rank
};

// Pure tally. Sort: correct desc, attempts desc as the engagement tiebreak.
// Players whose (correct, attempts) tuple matches another's get the same
// rank label ("T-1", "T-3", …). The next distinct group resumes at the
// absolute position (competition ranking — 1, 1, 3, 4 — not dense).
export function tallyScores(
  players: Player[],
  cards: Card[],
  guesses: Guess[],
): Score[] {
  type Base = Omit<Score, "rank" | "tied">;
  const tally = new Map<string, Base>();
  for (const p of players) {
    tally.set(p.id, { player: p, correct: 0, attempts: 0 });
  }

  const cardOwner = new Map<string, string>();
  for (const c of cards) cardOwner.set(c.id, c.player_id);

  for (const g of guesses) {
    const owner = cardOwner.get(g.card_id);
    if (!owner) continue;
    const score = tally.get(g.guesser_id);
    if (!score) continue;
    score.attempts += 1;
    if (g.guessed_player_id === owner) score.correct += 1;
  }

  const sorted = Array.from(tally.values()).sort(
    (a, b) => b.correct - a.correct || b.attempts - a.attempts,
  );

  // First pass: assign ranks (tied → previous rank, else absolute position).
  let lastRank = 0;
  let lastCorrect = -1;
  let lastAttempts = -1;
  const ranked = sorted.map((s, i): Score => {
    const isTie =
      i > 0 && s.correct === lastCorrect && s.attempts === lastAttempts;
    const rank = isTie ? lastRank : i + 1;
    lastRank = rank;
    lastCorrect = s.correct;
    lastAttempts = s.attempts;
    return { ...s, rank, tied: false };
  });

  // Second pass: mark `tied` for ranks shared by 2+ players.
  const rankCounts = new Map<number, number>();
  for (const s of ranked) {
    rankCounts.set(s.rank, (rankCounts.get(s.rank) ?? 0) + 1);
  }
  for (const s of ranked) {
    if ((rankCounts.get(s.rank) ?? 0) > 1) s.tied = true;
  }

  return ranked;
}

// "1st", "2nd", "T-3rd", … — used by both final views.
export function rankLabel(rank: number, tied: boolean): string {
  const tens = rank % 100;
  const suffix =
    tens >= 11 && tens <= 13
      ? "th"
      : rank % 10 === 1
        ? "st"
        : rank % 10 === 2
          ? "nd"
          : rank % 10 === 3
            ? "rd"
            : "th";
  return `${tied ? "T-" : ""}${rank}${suffix}`;
}
