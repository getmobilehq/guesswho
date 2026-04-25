"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Page } from "@/components/brand/Page";
import { BackBar } from "@/components/brand/BackBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Section } from "@/components/ui/Section";
import { Hint } from "@/components/ui/Hint";
import { ErrorMsg } from "@/components/ui/ErrorMsg";

import { localToken } from "@/lib/hooks/useLocalToken";
import { submitAnswers } from "@/lib/actions/submitAnswers";
import { supabase } from "@/lib/supabase/client";
import type { SessionStatus } from "@/lib/supabase/types";

type Props = {
  code: string;
  status: SessionStatus;
  questions: [string, string, string];
};

export default function SubmitView({ code, status, questions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<[string, string, string]>(["", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  // If the host has already started the game, jump out of submit.
  useEffect(() => {
    if (status !== "lobby") {
      router.replace(`/play/${code}/wait`);
    }
  }, [status, router, code]);

  // If we already submitted (e.g. user hit back), bounce to /wait.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const playerId = localToken.get("player-id", code);
      if (!playerId) return;
      const { data, error } = await supabase
        .from("answers")
        .select("q_index")
        .eq("player_id", playerId);
      if (cancelled) return;
      if (!error && data && data.length >= 3) {
        router.replace(`/play/${code}/wait`);
        return;
      }
      setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  // Watch session status — if host starts mid-write, stop blocking the player.
  useEffect(() => {
    const ch = supabase
      .channel(`submit-status:${code}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `code=eq.${code}`,
        },
        (payload) => {
          const next = (payload.new as { status: SessionStatus }).status;
          if (next !== "lobby") router.replace(`/play/${code}/wait`);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [code, router]);

  const update = (i: 0 | 1 | 2, v: string) => {
    setAnswers((prev) => {
      const next = [...prev] as [string, string, string];
      next[i] = v;
      return next;
    });
  };

  const filledCount = answers.filter((a) => a.trim().length > 0).length;
  const canSubmit = filledCount >= 1;

  const submit = () => {
    setError(null);
    if (!canSubmit) {
      setError("Answer at least one question to lock in.");
      return;
    }
    const playerId = localToken.get("player-id", code);
    const playerToken = localToken.get("player", code);
    if (!playerId || !playerToken) {
      router.replace(`/play/${code}`);
      return;
    }
    startTransition(async () => {
      const r = await submitAnswers({
        code,
        playerId,
        playerToken,
        answers: answers.map((a) => a.trim()) as [string, string, string],
      });
      if (!r.ok) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      router.push(`/play/${code}/wait`);
    });
  };

  if (!bootstrapped) return null;

  return (
    <Page>
      <BackBar />
      <div className="text-center mb-8">
        <div className="text-[11px] text-gold tracking-[0.3em] uppercase">
          Session {code}
        </div>
        <h2 className="font-[var(--font-head)] font-bold text-[36px] leading-tight tracking-[-0.02em] mt-3 mb-3 text-ivory">
          Your answers
        </h2>
        <p className="text-muted text-sm leading-relaxed">
          Answer at least one. Skip the others if they don&apos;t fit. The more
          vivid the answer, the better the storytelling moment when it gets
          revealed.
        </p>
      </div>

      {questions.map((q, i) => (
        <Section key={i} label={`Question ${i + 1} · optional`}>
          <div className="font-[var(--font-head)] italic text-[17px] text-ivory mb-3 leading-snug">
            &ldquo;{q}&rdquo;
          </div>
          <Input
            multiline
            value={answers[i]}
            onChange={(e) => update(i as 0 | 1 | 2, e.target.value)}
            maxLength={500}
            placeholder="Your answer, or leave blank to skip…"
            aria-label={`Answer for question ${i + 1}`}
          />
          <Hint>{500 - answers[i].length} characters left</Hint>
        </Section>
      ))}

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <Button
        variant="primary"
        full
        size="lg"
        onClick={submit}
        disabled={pending || !canSubmit}
      >
        {pending
          ? "Submitting…"
          : canSubmit
            ? `Lock in my ${filledCount === 1 ? "answer" : "answers"}`
            : "Answer at least one to lock in"}
      </Button>
      <Hint className="text-center mt-3">
        Once submitted, your answers can&apos;t be changed.
      </Hint>
    </Page>
  );
}
