import type { Score } from "@/lib/game/scoring";
import { cn } from "@/lib/cn";

export function Podium({
  rank,
  entry,
  height,
  medal,
  gold = false,
}: {
  rank: 1 | 2 | 3;
  entry: Score;
  height: number;
  medal: string;
  gold?: boolean;
}) {
  return (
    <div className="text-center min-w-[130px]" aria-label={`Rank ${rank}`}>
      <div className="text-[36px] mb-2 leading-none">{medal}</div>
      <div className="font-[var(--font-head)] text-lg text-ivory mb-3 font-semibold">
        {entry.player.name}
      </div>
      <div
        className={cn(
          "w-full flex flex-col items-center justify-center px-3 pt-3 pb-4 rounded-t border",
          gold ? "border-gold" : "border-border",
        )}
        style={{
          height,
          background: gold
            ? "linear-gradient(180deg, #F4C753, #C9A227)"
            : "var(--color-elevated)",
        }}
      >
        <div
          className={cn(
            "font-[var(--font-head)] text-[48px] leading-none font-bold",
            gold ? "text-bg" : "text-gold",
          )}
        >
          {entry.correct}
        </div>
        <div
          className={cn(
            "text-[11px] tracking-[0.15em] mt-1",
            gold ? "text-bg/85" : "text-muted",
          )}
        >
          CORRECT
        </div>
      </div>
    </div>
  );
}

export default Podium;
