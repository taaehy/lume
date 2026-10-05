"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  color: "var(--popover-foreground)",
  fontSize: "12px",
};

function ChartShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-5 h-64">{children}</div>
    </section>
  );
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 10 };

export function AnalyticsCharts({
  statusData,
  trendData,
  releaseData,
}: {
  statusData: { name: string; value: number }[];
  trendData: { week: string; abertos: number; resolvidos: number }[];
  releaseData: { release: string; bugs: number; score: number }[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartShell
        title="Bugs por status"
        description="Distribuição atual do fluxo operacional."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={statusData.map((row) => ({
              ...row,
              name:
                (
                  {
                    BACKLOG: "Backlog",
                    OPEN: "Aberto",
                    INVESTIGATING: "Investigação",
                    IN_PROGRESS: "Desenvolvimento",
                    READY_FOR_QA: "QA",
                    TESTING: "Em teste",
                    RESOLVED: "Resolvido",
                    CLOSED: "Fechado",
                    REOPENED: "Reaberto",
                  } as Record<string, string>
                )[row.name] ?? row.name,
            }))}
            margin={{ left: -20, right: 8 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="4 6"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={axisTick}
            />
            <YAxis axisLine={false} tickLine={false} tick={axisTick} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "var(--muted)" }}
            />
            <Bar
              isAnimationActive={false}
              dataKey="value"
              fill="var(--primary)"
              radius={[5, 5, 0, 0]}
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell
        title="Bugs encontrados por release"
        description="Volume comparado ao Quality Score publicado."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={releaseData} margin={{ left: -20, right: 8 }}>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="4 6"
            />
            <XAxis
              dataKey="release"
              axisLine={false}
              tickLine={false}
              tick={axisTick}
            />
            <YAxis axisLine={false} tickLine={false} tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              isAnimationActive={false}
              dataKey="bugs"
              stroke="var(--destructive)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="score"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell
        title="Aberturas e resoluções"
        description="Quantidade registrada em cada uma das últimas seis semanas."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ left: -20, right: 8 }}>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="4 6"
            />
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              tick={axisTick}
            />
            <YAxis axisLine={false} tickLine={false} tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              dataKey="abertos"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="resolvidos"
              stroke="var(--destructive)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}
