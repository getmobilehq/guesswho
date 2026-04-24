type Player = { id: string; name: string };
type Card = { id: string; player_id: string };
type Guess = { card_id: string; guesser_id: string; guessed_player_id: string };

export type Score = {
  player: Player;
  correct: number;
  attempts: number;
};

// Pure tally. Sorted by correct desc, then attempts desc as the tiebreak.
// (More attempts = more engagement; the player who tried more wins ties.)
export function tallyScores(
  players: Player[],
  cards: Card[],
  guesses: Guess[],
): Score[] {
  const tally = new Map<string, Score>();
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

  return Array.from(tally.values()).sort(
    (a, b) => b.correct - a.correct || b.attempts - a.attempts,
  );
}
