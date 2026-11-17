"use client";
import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

type Series = { key: string; label: string; color?: "s1" | "s2" | "s3" };
type Props = { data: Record<string, string | number | null>[]; x: string; series: Series[]; kind?: "bar" | "line"; height?: number; unit?: string; yMax?: number; empty?: string };

/** Single-axis chart with tooltip, legend (≥2 series) and a table view for accessibility. */
export function Chart({ data, x, series, kind = "bar", height = 220, unit = "", yMax, empty = "Nothing logged in this period yet." }: Props) {
  const [table, setTable] = useState(false);
  const hasData = data.some((d) => series.some((s) => typeof d[s.key] === "number" && (d[s.key] as number) > 0));
  if (!hasData) return <p className="py-8 text-center text-sm text-muted dark:text-white/60">{empty}</p>;
  const color = (s: Series, i: number) => `var(--${s.color ?? ["s1", "s2", "s3"][i % 3]})`;
  const axis = { stroke: "var(--axis)", fontSize: 12, tickLine: false, axisLine: false } as const;
  const tooltipStyle = { borderRadius: 14, border: "1px solid var(--grid)", fontSize: 13 };
  return (
    <div>
      <div className="mb-1 flex justify-end">
        <button onClick={() => setTable((t) => !t)} className="text-xs font-semibold text-lavender-deep underline-offset-2 hover:underline dark:text-lavender">
          {table ? "Show chart" : "Show as table"}
        </button>
      </div>
      {table ? (
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="py-1">Date</th>{series.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
            <tbody>{data.map((d, i) => <tr key={i} className="border-t border-line dark:border-night-line"><td className="py-1">{d[x]}</td>{series.map((s) => <td key={s.key}>{d[s.key] ?? "—"}{d[s.key] != null ? unit : ""}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {kind === "bar" ? (
            <BarChart data={data} barGap={2} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey={x} {...axis} />
              <YAxis {...axis} allowDecimals={false} domain={[0, yMax ?? "auto"]} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--grid)", opacity: 0.5 }} formatter={(v) => `${v}${unit}`} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={color(s, i)} radius={[4, 4, 0, 0]} maxBarSize={22} />)}
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey={x} {...axis} />
              <YAxis {...axis} domain={[0, yMax ?? "auto"]} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}${unit}`} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {series.map((s, i) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={color(s, i)} strokeWidth={2} dot={{ r: 4 }} connectNulls />)}
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}
