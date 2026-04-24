"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Section } from "@/components/ui/Section";
import { Hint } from "@/components/ui/Hint";
import { ErrorMsg } from "@/components/ui/ErrorMsg";

import { localToken } from "@/lib/hooks/useLocalToken";
import { joinSession } from "@/lib/actions/joinSession";

export function PlayerJoinForm({
  initialCode = "",
  codeLocked = false,
}: {
  initialCode?: string;
  codeLocked?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // If a player token already exists for this code, don't make them re-type.
  useEffect(() => {
    if (!initialCode) return;
    const existing = localToken.get("player", initialCode);
    if (existing) router.replace(`/play/${initialCode}/submit`);
  }, [initialCode, router]);

  const submit = () => {
    setError(null);
    if (code.trim().length < 3) {
      setError("Enter the session code from the host.");
      return;
    }
    if (!name.trim()) {
      setError("Add your name so others can guess you.");
      return;
    }
    startTransition(async () => {
      const r = await joinSession({ code: code.trim(), name: name.trim() });
      if (!r.ok) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      const upper = code.trim().toUpperCase();
      localToken.set("player", upper, r.playerToken);
      localToken.set("player-id", upper, r.playerId);
      // Skip submit screen if the host already started — Phase 3+ redirects.
      router.push(`/play/${upper}/submit`);
    });
  };

  return (
    <>
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
          placeholder="ABCD"
          autoFocus={!initialCode}
          maxLength={8}
          disabled={codeLocked}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Session code"
        />
      </Section>

      <Section label="Your name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="How others know you"
          maxLength={30}
          autoFocus={Boolean(initialCode)}
          aria-label="Your name"
        />
        <Hint>Use the name your fellow players will recognise.</Hint>
      </Section>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <Button variant="primary" full size="lg" onClick={submit} disabled={pending}>
        {pending ? "Joining…" : "Enter the lobby"}
      </Button>
    </>
  );
}

export default PlayerJoinForm;
