"use client";

import Link from "next/link";

import { Page } from "@/components/brand/Page";
import { Logo } from "@/components/brand/Logo";

const STEPS: { num: string; title: string; body: string }[] = [
  {
    num: "ONE",
    title: "Join",
    body: "Scan the QR code on the lobby screen, or visit guesswho.online and enter the session code.",
  },
  {
    num: "TWO",
    title: "Answer privately",
    body: "Three questions. Answer at least one — your name stays hidden until your card is revealed.",
  },
  {
    num: "THREE",
    title: "Guess who",
    body: "Answers are revealed one at a time on this screen. Tap who you think wrote each one. Change your mind any time before the reveal.",
  },
  {
    num: "FOUR",
    title: "Reveal & share",
    body: "The author's name drops in gold. Right or wrong, they get the floor — share the story if you'd like.",
  },
  {
    num: "FIVE",
    title: "Win the room",
    body: "One point per correct guess. Most correct tops the leaderboard. Ties resolved by engagement.",
  },
];

export default function RulesView({
  code,
  questions,
}: {
  code: string;
  questions: [string, string, string];
}) {
  return (
    <Page width="full">
      <div className="flex justify-between items-center mb-12">
        <Logo />
        <div className="font-[var(--font-ui)] text-muted text-[13px] tracking-[0.2em]">
          CODE <span className="text-gold">{code}</span>
        </div>
      </div>

      <div className="text-center mb-12">
        <div className="text-[11px] tracking-[0.4em] text-gold mb-4 uppercase">
          A Storytelling Party Game
        </div>
        <h1
          className="font-[var(--font-head)] text-ivory leading-none tracking-[-0.02em] m-0 mb-6 font-bold"
          style={{ fontSize: "clamp(48px, 9vw, 96px)" }}
        >
          How this works
        </h1>
        <p
          className="font-[var(--font-head)] italic text-muted leading-relaxed max-w-[760px] mx-auto"
          style={{ fontSize: "clamp(16px, 2vw, 22px)" }}
        >
          Anonymous answers. Live guessing. The stories behind each one.
        </p>
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 max-w-[1000px] mx-auto mb-16 list-none p-0">
        {STEPS.map((step) => (
          <li
            key={step.num}
            className="flex gap-5 items-start border-l-2 border-gold/40 pl-5"
          >
            <div className="font-[var(--font-head)] text-gold font-bold tracking-[0.15em] text-[14px] pt-1 min-w-[64px]">
              {step.num}
            </div>
            <div>
              <div
                className="font-[var(--font-head)] text-ivory font-bold mb-1.5"
                style={{ fontSize: "clamp(22px, 2.4vw, 30px)" }}
              >
                {step.title}
              </div>
              <p
                className="text-muted leading-relaxed m-0"
                style={{ fontSize: "clamp(15px, 1.4vw, 18px)" }}
              >
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="max-w-[860px] mx-auto bg-surface border border-gold/30 rounded-lg px-8 py-7 mb-12">
        <div className="text-[11px] tracking-[0.3em] text-gold mb-4 text-center uppercase font-semibold">
          Tonight&apos;s questions
        </div>
        <ol className="space-y-3 list-none p-0 m-0">
          {questions.map((q, i) => (
            <li
              key={i}
              className="flex gap-4 items-start font-[var(--font-head)] italic text-ivory leading-snug"
              style={{ fontSize: "clamp(17px, 2vw, 22px)" }}
            >
              <span className="text-gold not-italic font-bold min-w-[28px]">
                {i + 1}.
              </span>
              <span>&ldquo;{q}&rdquo;</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="text-center mb-6">
        <Link
          href={`/host/${code}/lobby`}
          className="inline-flex items-center gap-2 text-muted hover:text-ivory transition-colors text-[15px]"
        >
          ← Back to the lobby
        </Link>
      </div>
    </Page>
  );
}
