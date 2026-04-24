// Hand-written DB types matching db/schema.sql.
// Generated types from `supabase gen types` would be more canonical, but the
// schema is small and stable enough that a local source-of-truth is simpler
// and avoids the dev-loop dependency on the Supabase CLI.

export type SessionStatus = "lobby" | "live" | "final";

export type SessionRow = {
  code: string;
  host_token: string;
  host_name: string;
  questions: [string, string, string];
  status: SessionStatus;
  current_card_index: number;
  card_revealed: boolean;
  created_at: string;
  ended_at: string | null;
};

export type PlayerRow = {
  id: string;
  session_code: string;
  name: string;
  player_token: string;
  joined_at: string;
};

export type AnswerRow = {
  player_id: string;
  q_index: 0 | 1 | 2;
  text: string;
};

export type CardRow = {
  id: string;
  session_code: string;
  player_id: string;
  q_index: number;
  position: number;
};

export type GuessRow = {
  card_id: string;
  guesser_id: string;
  guessed_player_id: string;
  created_at: string;
};

// Row shapes the client typically reads (no host_token / player_token).
export type PublicSession = Omit<SessionRow, "host_token">;
export type PublicPlayer = Omit<PlayerRow, "player_token">;
