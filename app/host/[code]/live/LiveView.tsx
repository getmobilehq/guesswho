"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Page } from "@/components/brand/Page";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { BigAnswerCard } from "@/components/game/BigAnswerCard";

import { useSession } from "@/lib/hooks/useSession";
import { useGuesses } from "@/lib/hooks/useGuesses";
import { localToken } from "@/lib/hooks/useLocalToken";
import { revealCard } from "@/lib/actions/revealCard";
import { nextCard } from "@/lib/actions/nextCard";
import type { CardRow, PublicSession } from "@/lib/supabase/types";

export type LiveCard = CardRow & { text: string };

type Player = { id: string; name: string };

export default function LiveView({
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
  const [advancing, startAdvancing] = useTransition();
  const [revealing, startRevealing] = useTransition();
  const [showAll, setShowAll] = useState(false);

  // If the session moved on (back to lobby would mean someone reset; final
  // means the host advanced past the last card), follow it.
  if (session.status === "final") {
    router.replace(`/host/${session.code}/final`);
  } else if (session.status === "lobby") {
    router.replace(`/host/${session.code}/lobby`);
  }

  const card = cards[session.current_card_index];

  const playersById = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const owner = card ? playersById.get(card.player_id) ?? null : null;
  const question = card ? session.questions[card.q_index] : "";
  // Eligible guessers are submitters (= anyone in the deck) minus the owner
  // of the current card. Non-submitters never reach this list, so the host
  // count "X / Y guessed" doesn't stall waiting on people who aren't playing.
  const submitterIds = useMemo(
    () => new Set(cards.map((c) => c.player_id)),
    [cards],
  );
  const eligibleGuessers = card
    ? players.filter(
        (p) => p.id !== card.player_id && submitterIds.has(p.id),
      )
    : [];

  const { byGuesser } = useGuesses(card?.id ?? null);
  const guessCount = byGuesser.size;
  const totalEligible = eligibleGuessers.length;

  const correctGuessers = useMemo(() => {
    if (!card) return [] as Player[];
    const out: Player[] = [];
    for (const [guesserId, guessedId] of byGuesser) {
      if (guessedId === card.player_id) {
        const p = playersById.get(guesserId);
        if (p) out.push(p);
      }
    }
    return out;
  }, [byGuesser, card, playersById]);

  const reveal = () => {
    const hostToken = localToken.get("host", session.code);
    if (!hostToken) return;
    startRevealing(async () => {
      const r = await revealCard({ code: session.code, hostToken });
      if (!r.ok) toast.error(r.error);
    });
  };

  const advance = () => {
    const hostToken = localToken.get("host", session.code);
    if (!hostToken) return;
    startAdvancing(async () => {
      const r = await nextCard({ code: session.code, hostToken });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.finished) router.replace(`/host/${session.code}/final`);
    });
  };

  if (!card) {
    return (
      <Page width="full">
        <div className="text-center pt-32 text-muted">
          The deck is empty. Try restarting the game.
        </div>
      </Page>
    );
  }

  const totalCards = cards.length;
  const progress =
    ((session.current_card_index + (session.card_revealed ? 1 : 0.5)) /
      totalCards) *
    100;

  return (
    <Page width="full">
      <div className="flex justify-between items-center mb-6">
        <div className="font-[var(--font-ui)] text-muted text-[13px] tracking-[0.2em]">
          CARD <span className="text-gold font-bold">{session.current_card_index + 1}</span> OF {totalCards}
        </div>
        <Logo small />
        <div className="font-[var(--font-ui)] text-muted text-[13px] tracking-[0.2em]">
          CODE <span className="text-gold">{session.code}</span>
        </div>
      </div>

      <div className="h-0.5 bg-border rounded mb-10 overflow-hidden">
        <div
          className="h-full bg-gold transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="text-center mb-8">
        <div className="text-[11px] tracking-[0.3em] text-muted mb-3 uppercase">
          The question
        </div>
        <div
          className="font-[var(--font-head)] italic text-ivory leading-snug max-w-[800px] mx-auto"
          style={{ fontSize: "clamp(22px, 3vw, 30px)" }}
        >
          &ldquo;{question}&rdquo;
        </div>
      </div>

      <BigAnswerCard
        answer={card.text}
        revealed={session.card_revealed}
        ownerName={session.card_revealed ? owner?.name?.toUpperCase() ?? null : null}
      />

      <div className="mt-10 text-center">
        {!session.card_revealed ? (
          <>
            <div className="font-[var(--font-head)] text-[28px] text-ivory mb-2">
              {guessCount} / {totalEligible} guessed
            </div>
            <div className="text-muted text-sm mb-8">
              Players are tapping their guess on their phones.
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={reveal}
              disabled={revealing || guessCount === 0}
              className="min-w-[260px]"
            >
              {revealing ? "Revealing…" : "Reveal answer"}
            </Button>
          </>
        ) : (
          <RevealPanel
            owner={owner}
            correctGuessers={correctGuessers}
            totalEligible={totalEligible}
            allGuesses={byGuesser}
            playersById={playersById}
            onNext={advance}
            advancing={advancing}
            isLast={session.current_card_index + 1 >= totalCards}
            showAll={showAll}
            toggleShowAll={() => setShowAll((s) => !s)}
          />
        )}
      </div>
    </Page>
  );
}

function RevealPanel({
  owner,
  correctGuessers,
  totalEligible,
  allGuesses,
  playersById,
  onNext,
  advancing,
  isLast,
  showAll,
  toggleShowAll,
}: {
  owner: Player | null;
  correctGuessers: Player[];
  totalEligible: number;
  allGuesses: Map<string, string>;
  playersById: Map<string, Player>;
  onNext: () => void;
  advancing: boolean;
  isLast: boolean;
  showAll: boolean;
  toggleShowAll: () => void;
}) {
  return (
    <div className="max-w-[700px] mx-auto">
      <div
        className="font-[var(--font-head)] font-bold text-gold mb-2"
        style={{ fontSize: "clamp(28px, 4vw, 42px)" }}
      >
        It was {owner?.name}.
      </div>
      <div className="text-ivory text-base mb-6">
        {correctGuessers.length} of {totalEligible} guessed correctly.
      </div>

      {correctGuessers.length > 0 && (
        <div className="mb-6">
          <div className="text-[11px] text-muted tracking-[0.2em] mb-2.5">
            ✦ CORRECT GUESSES
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {correctGuessers.map((p) => (
              <span
                key={p.id}
                className="px-3.5 py-1.5 rounded-full text-sm text-green border border-green/40 bg-green/10"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 py-5 my-6 max-w-[540px] mx-auto rounded-[var(--radius)] bg-gold/10 border border-gold/30 font-[var(--font-head)] italic text-base text-ivory">
        🎤 <strong className="text-gold">{owner?.name}</strong> — share the
        story behind this if you like.
      </div>

      <div className="flex gap-3 justify-center flex-wrap mt-8">
        <Button size="sm" onClick={toggleShowAll}>
          {showAll ? "Hide" : "Show"} all guesses
        </Button>
        <Button variant="primary" onClick={onNext} disabled={advancing}>
          {advancing ? "Loading…" : isLast ? "See final scores →" : "Next card →"}
        </Button>
      </div>

      {showAll && allGuesses.size > 0 && (
        <div className="mt-8 max-w-[480px] mx-auto text-left">
          {Array.from(allGuesses.entries()).map(([guesserId, guessedId]) => {
            const guesser = playersById.get(guesserId);
            const guessed = playersById.get(guessedId);
            const correct = guessedId === owner?.id;
            return (
              <div
                key={guesserId}
                className="flex justify-between px-4 py-2.5 border-b border-border text-sm"
              >
                <span className="text-muted">{guesser?.name ?? "—"}</span>
                <span className={correct ? "text-green" : "text-red"}>
                  {correct ? "✓" : "✗"} {guessed?.name ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
