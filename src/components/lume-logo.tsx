import Link from "next/link";
import { LumeSymbol } from "@/components/lume-symbol";

export function LumeLogo({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-3.5"
      aria-label="Lume — início"
    >
      <LumeSymbol className="h-11 w-9 shrink-0" />
      {!compact && (
        <span className="flex flex-col">
          <span
            className={`font-display text-[26px] font-semibold leading-none tracking-[-0.045em] ${inverted ? "text-white" : "text-foreground"}`}
          >
            Lume
          </span>
          <span
            className={`mt-1 text-[10px] tracking-wide ${inverted ? "text-white/55" : "text-muted-foreground"}`}
          >
            Clareza para software melhor
          </span>
        </span>
      )}
    </Link>
  );
}
