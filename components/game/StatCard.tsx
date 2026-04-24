import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "p-5 rounded-[var(--radius)] border transition-colors",
        highlight ? "bg-gold/10 border-gold/50" : "bg-surface border-border",
      )}
    >
      <div className="text-[11px] text-muted tracking-[0.2em] uppercase mb-2">
        {label}
      </div>
      <div
        className={cn(
          "font-[var(--font-head)] text-[32px] leading-none font-bold",
          highlight ? "text-gold" : "text-ivory",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export default StatCard;
