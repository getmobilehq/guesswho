"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";

import { Page } from "@/components/brand/Page";
import { BackBar } from "@/components/brand/BackBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Section } from "@/components/ui/Section";
import { Hint } from "@/components/ui/Hint";
import { ErrorMsg } from "@/components/ui/ErrorMsg";

import { DEFAULT_QUESTIONS, generateCode } from "@/lib/game/defaults";
import { localToken } from "@/lib/hooks/useLocalToken";
import { createSession } from "@/lib/actions/createSession";

export default function HostNewPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [hostName, setHostName] = useState("");
  const [questions, setQuestions] = useState<[string, string, string]>(
    DEFAULT_QUESTIONS,
  );
  const [error, setError] = useState<string | null>(null);

  // Generate the default code on the client to avoid SSR/CSR mismatch.
  useEffect(() => {
    setCode((prev) => prev || generateCode());
  }, []);

  const updateQuestion = (i: 0 | 1 | 2, value: string) => {
    setQuestions((prev) => {
      const next = [...prev] as [string, string, string];
      next[i] = value;
      return next;
    });
  };

  const submit = () => {
    setError(null);
    if (code.trim().length < 3) {
      setError("Pick a session code (3+ letters or numbers).");
      return;
    }
    if (questions.some((q) => !q.trim())) {
      setError("All 3 questions need text.");
      return;
    }
    startTransition(async () => {
      const r = await createSession({
        code: code.trim(),
        hostName: hostName.trim(),
        questions,
      });
      if (!r.ok) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      localToken.set("host", r.code, r.hostToken);
      router.push(`/host/${r.code}/lobby`);
    });
  };

  return (
    <Page>
      <BackBar onBack={() => router.push("/")} />
      <h2 className="font-[var(--font-head)] font-bold text-[36px] leading-tight tracking-[-0.02em] mt-2 mb-8 text-ivory">
        Set up your game
      </h2>

      <Section label="Session code">
        <Input
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 8),
            )
          }
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Session code"
        />
        <Hint>
          Players enter this code to join. Make it specific (e.g.{" "}
          <code className="text-ivory bg-elevated px-1.5 py-0.5 rounded">
            FELLOW1
          </code>
          ).
        </Hint>
      </Section>

      <Section label="Your name (optional)">
        <Input
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
          placeholder="Host"
          maxLength={30}
          aria-label="Host name"
        />
      </Section>

      <Section label="The 3 questions">
        <Hint className="mt-0 mb-3">
          Edit freely — questions that prompt stories work best.
        </Hint>
        {questions.map((q, i) => (
          <div key={i} className="mb-3">
            <div className="text-[11px] text-gold tracking-[0.2em] mb-2 font-semibold">
              QUESTION {i + 1}
            </div>
            <Input
              multiline
              value={q}
              onChange={(e) => updateQuestion(i as 0 | 1 | 2, e.target.value)}
              maxLength={300}
              aria-label={`Question ${i + 1}`}
            />
          </div>
        ))}
      </Section>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <Button variant="primary" full size="lg" onClick={submit} disabled={pending}>
        {pending ? "Creating…" : "Open the lobby"}
      </Button>
    </Page>
  );
}
