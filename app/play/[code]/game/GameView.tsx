"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Page } from "@/components/brand/Page";
import { Logo } from "@/components/brand/Logo";
import { GuessButtons } from "@/components/game/GuessButtons";

import { useSession } from "@/lib/hooks/useSession";
import { useGuesses } from "@/lib/hooks/useGuesses";
import { localToken } from "@/lib/hooks/useLocalToken";
import type { CardRow, PublicSession } from "@/lib/supabase/types";

type Player = { id: string; name: string };
type LiveCard = CardRow & { text: string };

export default function GameView({
  initialSession,
  cards,
  players,
}: {
  initialSession: PublicSession;
  cards: LiveCard[];
  players: Player[];
}) {
  const router = useRouter();
  const { session: liveSession } = useSession(initialSession.code, initialSession);
  const session = liveSession ?? initialSession;
  const [me, setMe] = useState<{ id: string; token: string } | null>(null);

  useEffect(() => {
    const id = localToken.get("player-id", session.code);
    const token = localToken.get("player", session.code);
    if (!id || !token) {
      router.replace(`/play/${session.code}`);
      return;
    }
    setMe({ id, token });
  }, [session.code, router]);

  // Follow status changes.
  useEffect(() => {
    if (session.status === "final") {
      router.replace(`/play/${session.code}/final`);
    } else if (session.status === "lobby") {
      router.replace(`/play/${session.code}/wait`);
    }
  }, [session.status, session.code, router]);

  const card = cards[session.current_card_index];
  const playersById = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);
  const owner = card ? playersById.get(card.player_id) ?? null : null;
  // Submitters are players who actually contributed at least one answer (and
  // therefore appear in the deck). Non-submitters joined the lobby but aren't
  // possible card owners — they shouldn't show up as guess candidates.
  const submitterIds = useMemo(
    () => new Set(cards.map((c) => c.player_id)),
    [cards],
  );
  // Candidates are submitters except the guesser themselves. The owner of any
  // card is necessarily a submitter and is in this set, so the correct answer
  // is always reachable.
  const candidates = useMemo(
    () =>
      card && me
        ? players.filter((p) => p.id !== me.id && submitterIds.has(p.id))
        : [],
    [card, me, players, submitterIds],
  );

  const { byGuesser } = useGuesses(card?.id ?? null);
  const myGuess = me ? byGuesser.get(me.id) ?? null : null;

  if (!me || !card) {
    return (
      <Page>
        <PlayerHeader code={session.code} index={session.current_card_index} total={cards.length} />
        <div className="text-center pt-20 text-muted">Connecting…</div>
      </Page>
    );
  }

  const isMine = card.player_id === me.id;

  // Branch 1 — this card belongs to me.
  if (isMine && !session.card_revealed) {
    return (
      <Page>
        <PlayerHeader code={session.code} index={session.current_card_index} total={cards.length} />
        <div className="text-center pt-10">
          <div className="text-5xl mb-4" aria-hidden>👀</div>
          <h2 className="font-[var(--font-head)] text-[28px] text-gold mb-3">
            This one&apos;s about you.
          </h2>
          <p className="text-muted text-[15px] leading-relaxed mb-8">
            Sit tight while the room guesses. When the host reveals, you can
            share more if you&apos;d like.
          </p>
          <div className="px-5 py-5 bg-surface border border-dashed border-gold/40 rounded-[var(--radius)] font-[var(--font-head)] italic text-base text-ivory leading-snug">
            &ldquo;{card.text}&rdquo;
          </div>
        </div>
      </Page>
    );
  }

  // Branch 2 — the card has been revealed.
  if (session.card_revealed) {
    const correct = myGuess === card.player_id;
    const guessed = myGuess ? playersById.get(myGuess) ?? null : null;

    return (
      <Page>
        <PlayerHeader code={session.code} index={session.current_card_index} total={cards.length} />
        <div className="text-center pt-10">
          {isMine ? (
            <>
              <h2 className="font-[var(--font-head)] text-[32px] text-gold mb-3">
                The room knows now.
              </h2>
              <p className="text-muted text-[15px] mb-8">
                Want to share the story? The mic is yours.
              </p>
            </>
          ) : (
            <>
              <div className="text-[64px] leading-none mb-2" aria-hidden>
                {correct ? "✓" : "✗"}
              </div>
              <div
                className={
                  "text-[13px] tracking-[0.3em] mb-4 " +
                  (correct ? "text-green" : "text-red")
                }
              >
                {myGuess ? (correct ? "CORRECT" : "NOT QUITE") : "NO GUESS"}
              </div>
              <h2 className="font-[var(--font-head)] text-[28px] mb-2">
                It was <span className="text-gold">{owner?.name}</span>
              </h2>
              {myGuess && !correct && guessed && (
                <p className="text-muted text-sm mb-8">
                  You guessed {guessed.name}.
                </p>
              )}
            </>
          )}
          <div className="mt-8 text-muted text-sm flex items-center justify-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full bg-gold"
              style={{ animation: "gw-pulse 1.5s ease-in-out infinite" }}
            />
            Waiting for next card…
          </div>
        </div>
      </Page>
    );
  }

  // Branch 3 — guess UI.
  return (
    <Page>
      <PlayerHeader code={session.code} index={session.current_card_index} total={cards.length} />

      <div className="px-5 py-6 bg-surface border border-border rounded-md mb-6">
        <div className="text-[11px] text-muted tracking-[0.25em] mb-2 uppercase">
          The question
        </div>
        <div className="font-[var(--font-head)] italic text-[15px] text-ivory mb-4 leading-snug">
          &ldquo;{session.questions[card.q_index]}&rdquo;
        </div>
        <div className="text-[11px] text-muted tracking-[0.25em] mb-2 uppercase">
          The answer
        </div>
        <div className="font-[var(--font-head)] text-[18px] text-ivory leading-relaxed font-medium">
          &ldquo;{card.text}&rdquo;
        </div>
      </div>

      <div className="text-[13px] tracking-[0.2em] text-gold mb-3 text-center font-semibold uppercase">
        {myGuess ? "✓ Locked in — change below if you like" : "Who said this?"}
      </div>

      <GuessButtons
        code={session.code}
        cardId={card.id}
        playerId={me.id}
        playerToken={me.token}
        candidates={candidates}
        serverGuess={myGuess}
      />
    </Page>
  );
}

function PlayerHeader({
  code,
  index,
  total,
}: {
  code: string;
  index: number;
  total: number;
}) {
  return (
    <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
      <div className="text-xs text-muted tracking-[0.2em]">
        CARD <span className="text-gold font-bold">{index + 1}</span> / {total}
      </div>
      <Logo small />
      <div className="text-xs text-muted tracking-[0.2em]">{code}</div>
    </div>
  );
}
