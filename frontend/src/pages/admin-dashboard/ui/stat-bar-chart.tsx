"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ChartRow = { label: string; value: number };

/** One series, one hue: the title names it, so there is no legend. Loaded lazily; Recharts is heavy. */
export default function StatBarChart({ data, unit = "" }: { data: ChartRow[]; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44 + 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }} barCategoryGap="28%">
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} domain={unit === "%" ? [0, 100] : undefined} />
        <YAxis type="category" dataKey="label" width={96} axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.5 }}
          formatter={(value) => [`${value}${unit}`, ""]}
          separator=""
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)", fontSize: 13 }}
          labelStyle={{ color: "var(--popover-foreground)", fontWeight: 600 }}
        />
        <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          <LabelList dataKey="value" position="right" formatter={(value) => `${value}${unit}`} style={{ fill: "var(--foreground)", fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
