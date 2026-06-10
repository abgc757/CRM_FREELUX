"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PERIODS = [
  { label: "Últimos 7 días",  value: "7d" },
  { label: "Últimos 30 días", value: "30d" },
  { label: "Este mes",        value: "month" },
  { label: "Este año",        value: "year" },
];

const ORANGE = "#e55c00";
const DARK   = "#111111";
const GRAY   = "#e4e4e4";

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 14px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  background: active ? "#000" : "transparent",
  color: active ? "#fff" : "#999",
  border: "1px solid",
  borderColor: active ? "#000" : "#e4e4e4",
  borderRadius: 3,
  cursor: "pointer",
});

export default function ReportsPage() {
  const [period, setPeriod] = useState("30d");

  const { data: kpis }       = useQuery({ queryKey: ["report-kpis",    period], queryFn: () => api.get("/reports/kpis",         { params: { period } }).then(r => r.data) });
  const { data: salesTrend } = useQuery({ queryKey: ["report-trend",   period], queryFn: () => api.get("/reports/sales-trend",  { params: { period } }).then(r => r.data), initialData: [] });
  const { data: topClients } = useQuery({ queryKey: ["report-clients", period], queryFn: () => api.get("/reports/top-clients",  { params: { period } }).then(r => r.data), initialData: [] });
  const { data: topProducts }= useQuery({ queryKey: ["report-products",period], queryFn: () => api.get("/reports/top-products", { params: { period } }).then(r => r.data), initialData: [] });
  const { data: conversion } = useQuery({ queryKey: ["report-conv",    period], queryFn: () => api.get("/reports/conversion",   { params: { period } }).then(r => r.data) });
  const { data: margins }    = useQuery({ queryKey: ["report-margins", period], queryFn: () => api.get("/reports/margins",      { params: { period } }).then(r => r.data), initialData: [] });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#111", letterSpacing: "-.02em" }}>Reportes</h1>
          <p style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Análisis de ventas, márgenes y rendimiento comercial</p>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)} style={tabStyle(period === p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
        {[
          { label: "Ventas totales",    val: kpis ? formatCurrency(kpis.ventas_total)  : "—", accent: false },
          { label: "Cotizaciones",      val: kpis?.cotizaciones_total ?? "—",                 accent: false },
          { label: "Conversión",        val: kpis ? `${kpis.tasa_conversion}%`         : "—", accent: false },
          { label: "Ticket promedio",   val: kpis ? formatCurrency(kpis.ticket_promedio): "—", accent: false },
          { label: "Margen promedio",   val: kpis ? `${kpis.margen_promedio}%`          : "—", accent: (kpis?.margen_promedio ?? 0) < 20 },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: "14px 16px" }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#bbb", marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-.03em", color: k.accent ? ORANGE : DARK, lineHeight: 1 }}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f0f0" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#555" }}>Tendencia de ventas</p>
        </div>
        <div style={{ padding: "16px 12px 8px", height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTrend} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRAY} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#aaa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#aaa" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#111", border: "none", borderRadius: 3, color: "#fff", fontSize: 11 }}
                formatter={(v: any) => [formatCurrency(v), "Ventas"]} />
              <Line type="monotone" dataKey="total" stroke={ORANGE} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: ORANGE }} />
              <Line type="monotone" dataKey="cotizaciones" stroke="#ccc" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ padding: "0 18px 12px", display: "flex", gap: 20 }}>
          <LegendDot color={ORANGE} label="Ventas" />
          <LegendDot color="#ccc"   label="Cotizaciones" dashed />
        </div>
      </div>

      {/* Top clients + Top products */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Top clients */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <SectionHeader title="Top 10 clientes" subtitle="Por monto de ventas" />
          <div style={{ padding: "8px 0" }}>
            {(topClients as any[]).slice(0, 10).map((c, i) => (
              <div key={c.client_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 16px", borderBottom: "1px solid #f8f8f8" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: i < 3 ? ORANGE : "#ccc", width: 18, flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</p>
                  <p style={{ fontSize: 10, color: "#aaa" }}>{c.num_ventas} venta{c.num_ventas !== 1 ? "s" : ""}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#111", flexShrink: 0 }}>{formatCurrency(c.total)}</span>
              </div>
            ))}
            {(topClients as any[]).length === 0 && (
              <p style={{ padding: "20px 16px", fontSize: 12, color: "#bbb", textAlign: "center" }}>Sin datos en el período seleccionado</p>
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <SectionHeader title="Top 10 productos" subtitle="Por volumen de ventas" />
          <div style={{ height: 300, padding: "12px 8px 8px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(topProducts as any[]).slice(0, 10)} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid stroke={GRAY} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: "#aaa" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="descripcion" tick={{ fontSize: 9, fill: "#666" }} axisLine={false} tickLine={false} width={100}
                  tickFormatter={(v: string) => v.length > 14 ? v.slice(0,14)+"…" : v} />
                <Tooltip contentStyle={{ background: "#111", border: "none", borderRadius: 3, color: "#fff", fontSize: 10 }}
                  formatter={(v: any) => [formatCurrency(v), "Total"]} />
                <Bar dataKey="total" fill={ORANGE} radius={[0, 2, 2, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Conversion funnel + Margins */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Conversion funnel */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <SectionHeader title="Embudo de conversión" subtitle="Cotización → Venta" />
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Cotizaciones generadas", val: conversion?.cotizaciones ?? 0,       color: "#e4e4e4", pct: 100 },
              { label: "Cotizaciones enviadas",  val: conversion?.enviadas     ?? 0,       color: "#bbb",    pct: conversion ? Math.round((conversion.enviadas/conversion.cotizaciones)*100)||0 : 0 },
              { label: "Ventas realizadas",      val: conversion?.ventas       ?? 0,       color: ORANGE,    pct: conversion ? Math.round((conversion.ventas/conversion.cotizaciones)*100)||0 : 0 },
            ].map(r => (
              <div key={r.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#666" }}>{r.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#111" }}>{r.val} <span style={{ fontWeight: 400, color: "#aaa" }}>({r.pct}%)</span></span>
                </div>
                <div style={{ height: 6, background: "#f3f3f3", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: r.color, borderRadius: 3, width: `${r.pct}%`, transition: "width .5s" }} />
                </div>
              </div>
            ))}
          </div>
          {conversion && (
            <div style={{ padding: "8px 24px 16px", borderTop: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#999" }}>Tasa de conversión total</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: ORANGE }}>{conversion.tasa_conversion}%</span>
            </div>
          )}
        </div>

        {/* Margins by category */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <SectionHeader title="Márgenes por categoría" subtitle="Utilidad bruta estimada" />
          <div style={{ height: 260, padding: "12px 8px 8px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={margins as any[]} margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid stroke={GRAY} vertical={false} />
                <XAxis dataKey="categoria" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => v.length > 10 ? v.slice(0,10)+"…" : v} />
                <YAxis tick={{ fontSize: 9, fill: "#aaa" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: "#111", border: "none", borderRadius: 3, color: "#fff", fontSize: 10 }}
                  formatter={(v: any) => [`${v}%`, "Margen"]} />
                <Bar dataKey="margen" radius={[2, 2, 0, 0]} barSize={28}>
                  {(margins as any[]).map((_: any, i: number) => (
                    <Cell key={i} fill={i % 2 === 0 ? ORANGE : "#333"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#555" }}>{title}</p>
      {subtitle && <p style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>{subtitle}</p>}
    </div>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 16, height: 2, background: dashed ? "transparent" : color, borderTop: dashed ? `2px dashed ${color}` : "none" }} />
      <span style={{ fontSize: 10, color: "#aaa" }}>{label}</span>
    </div>
  );
}
