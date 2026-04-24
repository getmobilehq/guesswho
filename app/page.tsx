import Link from "next/link";
import { Page } from "@/components/brand/Page";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <Page>
      <div className="pt-14 text-center">
        <div className="font-[var(--font-ui)] text-[11px] tracking-[0.3em] text-gold uppercase mb-3">
          A Storytelling Party Game
        </div>

        <h1
          className="font-[var(--font-head)] font-bold leading-[0.95] tracking-[-0.03em] text-ivory m-0 mb-4"
          style={{ fontSize: "clamp(48px, 12vw, 84px)" }}
        >
          Guess<br />
          <span className="text-gold">Who.</span>
        </h1>

        <p className="font-[var(--font-head)] italic text-[18px] text-muted leading-relaxed max-w-[380px] mx-auto mb-14">
          Anonymous answers. Live guessing. The stories behind each one.
        </p>

        <div className="flex flex-col gap-[14px]">
          <Link href="/host/new" aria-label="Start hosting a new game">
            <Button variant="primary" full size="lg">
              I&apos;m hosting
            </Button>
          </Link>
          <Link href="/play" aria-label="Join an existing game">
            <Button variant="secondary" full size="lg">
              I&apos;m joining
            </Button>
          </Link>
        </div>

        <div className="mt-16 text-[13px] text-muted leading-[1.7] text-left">
          <strong className="text-ivory">How it works:</strong> Players submit
          anonymous answers to 3 questions before the event. The host reveals
          one answer at a time on a big screen. Everyone guesses who said it.
          Stories follow.
        </div>
      </div>
    </Page>
  );
}
