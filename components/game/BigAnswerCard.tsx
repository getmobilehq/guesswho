import { cn } from "@/lib/cn";

export function BigAnswerCard({
  answer,
  revealed,
  ownerName,
}: {
  answer: string;
  revealed: boolean;
  ownerName?: string | null;
}) {
  return (
    <div
      className={cn(
        "relative max-w-[800px] mx-auto px-10 py-12 rounded-lg bg-surface border-2 transition-all duration-500 min-h-[200px]",
        revealed ? "border-gold" : "border-border",
      )}
      style={
        revealed
          ? { boxShadow: "0 0 60px rgba(244, 199, 83, 0.33)" }
          : undefined
      }
    >
      {revealed && ownerName && (
        <div
          className="absolute -top-4 left-1/2 px-4 py-1.5 rounded-full bg-gold text-bg text-xs font-bold tracking-[0.2em] uppercase"
          style={{
            transform: "translateX(-50%)",
            animation: "gw-pop 0.4s ease",
          }}
        >
          {ownerName}
        </div>
      )}
      <div
        className="font-[var(--font-head)] leading-relaxed text-ivory font-normal text-center"
        style={{ fontSize: "clamp(20px, 2.6vw, 28px)" }}
      >
        &ldquo;{answer}&rdquo;
      </div>
    </div>
  );
}

export default BigAnswerCard;
