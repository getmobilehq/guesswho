"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Page } from "@/components/brand/Page";
import { BackBar } from "@/components/brand/BackBar";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { StatCard } from "@/components/game/StatCard";
import { JoinQR } from "@/components/game/JoinQR";

import { localToken } from "@/lib/hooks/useLocalToken";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { startGame } from "@/lib/actions/startGame";
import type { PublicSession } from "@/lib/supabase/types";

export default function LobbyView({
  session,
  appUrl,
}: {
  session: PublicSession;
  appUrl: string;
}) {
  const router = useRouter();
  const { players, submittedCount, totalAnswers, status } = usePlayers(session.code);
  const [copied, setCopied] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [starting, startStarting] = useTransition();

  // Routing transitions when the host moves the game forward in another tab,
  // or returns from the live screen back here.
  useEffect(() => {
    if (status === "live") router.replace(`/host/${session.code}/live`);
    else if (status === "final") router.replace(`/host/${session.code}/final`);
  }, [status, session.code, router]);

  const canStart = submittedCount >= 3;
  const totalCards = totalAnswers;
  const stillNeeded = Math.max(0, 3 - submittedCount);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(session.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Read it out loud instead.");
    }
  };

  const exit = () => {
    localToken.clear("host", session.code);
    router.replace("/");
  };

  const start = () => {
    const hostToken = localToken.get("host", session.code);
    if (!hostToken) {
      toast.error("Host token missing — restart the lobby.");
      return;
    }
    startStarting(async () => {
      const r = await startGame({ code: session.code, hostToken });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      router.push(`/host/${session.code}/live`);
    });
  };

  return (
    <Page width="wide">
      <BackBar onBack={() => setConfirmExit(true)} />

      <div className="text-center mb-12">
        <div className="text-[11px] text-muted tracking-[0.3em] uppercase mb-3">
          Share this code to join
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="bg-transparent border-2 border-dashed border-gold rounded-lg px-10 py-6 cursor-pointer text-gold font-[var(--font-head)] font-bold tracking-[0.15em] inline-block hover:bg-gold/5 transition-colors"
          style={{ fontSize: "clamp(48px, 10vw, 64px)" }}
          aria-label={`Session code ${session.code}, tap to copy`}
        >
          {session.code}
        </button>
        <div className="text-[13px] text-muted mt-3 h-[18px]">
          {copied ? "✓ Copied to clipboard" : "Tap to copy · Players join from /play"}
        </div>
        <a
          href={`/host/${session.code}/deck`}
          download={`guess-who-rules-${session.code}.pptx`}
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-[var(--radius)] border border-border bg-surface text-ivory text-[13px] hover:border-gold hover:text-gold transition-colors"
        >
          Download rules deck (.pptx) ↓
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard label="Players joined" value={players.length} />
        <StatCard
          label="Players ready"
          value={`${submittedCount}/${players.length}`}
          highlight={canStart && submittedCount === players.length}
        />
        <StatCard label="Cards in deck" value={totalCards} />
      </div>

      <div className="flex flex-col items-center gap-3 mb-10">
        <JoinQR code={session.code} appUrl={appUrl} />
      </div>

      <Section label="Roster">
        {players.length === 0 ? (
          <div className="px-6 py-7 text-center text-muted text-sm border border-dashed border-border rounded-[var(--radius)]">
            Waiting for players to join…
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <div
                key={p.id}
                className={
                  "px-3.5 py-2 rounded-full text-sm flex items-center gap-2 border " +
                  (p.submitted
                    ? "bg-gold/15 border-gold/55 text-ivory"
                    : "bg-surface border-border text-ivory")
                }
              >
                <span className={p.submitted ? "text-gold" : "text-muted"}>
                  {p.submitted ? "●" : "○"}
                </span>
                {p.name}
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="sticky bottom-0 -mx-5 px-5 pt-6 pb-3 bg-gradient-to-t from-bg via-bg/95 to-transparent">
        <Button
          variant="primary"
          size="lg"
          full
          disabled={!canStart || starting}
          onClick={canStart ? start : undefined}
        >
          {starting
            ? "Building deck…"
            : canStart
              ? `Start game · ${totalCards} cards`
              : stillNeeded === 1
                ? "Waiting for 1 more submission"
                : `Waiting for ${stillNeeded} more submissions`}
        </Button>
      </div>

      {confirmExit && (
        <div
          className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-5 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-surface border border-border rounded-lg p-7 max-w-[420px] w-full">
            <h3 className="font-[var(--font-head)] text-2xl mb-3">
              End this session?
            </h3>
            <p className="text-muted text-sm mb-6">
              Players will lose progress. The session code becomes free.
            </p>
            <div className="flex gap-3">
              <Button full onClick={() => setConfirmExit(false)}>
                Keep going
              </Button>
              <Button full variant="danger" onClick={exit}>
                End session
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
