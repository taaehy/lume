import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  BACKLOG: "Backlog",
  OPEN: "Aberto",
  READY_FOR_QA: "Pronto para QA",
  IN_PROGRESS: "Em progresso",
  INVESTIGATING: "Investigando",
  TESTING: "Em teste",
  RESOLVED: "Resolvido",
  REOPENED: "Reaberto",
  CLOSED: "Fechado",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={cn(
        status === "REOPENED"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300"
          : "bg-muted text-muted-foreground",
      )}
    >
      {labels[status] ?? status}
    </Badge>
  );
}
