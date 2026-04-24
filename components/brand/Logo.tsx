import { cn } from "@/lib/cn";

export function Logo({ small = false, className }: { small?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "font-[var(--font-head)] font-bold tracking-tight text-ivory",
        small ? "text-[18px]" : "text-2xl",
        className,
      )}
    >
      <span className="text-gold">·</span> Guess Who <span className="text-gold">·</span>
    </div>
  );
}

export default Logo;
