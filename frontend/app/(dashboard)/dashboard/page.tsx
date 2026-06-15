"use client";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: stock }        = useQuery({ queryKey: ["stock-summary"],       queryFn: () => api.get("/inventory/stock").then(r => r.data),                      staleTime: 60000 });
  const { data: col }          = useQuery({ queryKey: ["collections-summary"], queryFn: () => api.get("/collections/summary").then(r => r.data),                   staleTime: 60000 });
  const { data: sales }        = useQuery({ queryKey: ["sales-count"],         queryFn: () => api.get("/sales",   { params: { page_size: 1 } }).then(r => r.data), staleTime: 60000 });
  const { data: quotes }       = useQuery({ queryKey: ["quotes-count"],        queryFn: () => api.get("/quotes",  { params: { page_size: 1 } }).then(r => r.data), staleTime: 60000 });
  const { data: clients }      = useQuery({ queryKey: ["clients-count"],       queryFn: () => api.get("/clients", { params: { page_size: 1 } }).then(r => r.data), staleTime: 60000 });
  const { data: alerts = [] }  = useQuery({ queryKey: ["stock-alerts"],        queryFn: () => api.get("/inventory/alerts").then(r => r.data),                      staleTime: 60000 });
  const { data: overdueList = [] } = useQuery({ queryKey: ["overdue"],         queryFn: () => api.get("/collections/overdue").then(r => r.data),                   staleTime: 60000 });

  const firstName = user?.full_name?.split(" ")[0] ?? "Usuario";

  const kpis = [
    { label: "Cotizaciones", value: quotes?.total  ?? "—", href: "/dashboard/quotes",      accent: false },
    { label: "Ventas",       value: sales?.total   ?? "—", href: "/dashboard/sales",       accent: false },
    { label: "Clientes",     value: clients?.total ?? "—", href: "/dashboard/clients",     accent: false },
    { label: "Cartera venc.", value: col ? formatCurrency(col.vencido_total) : "—", href: "/dashboard/collections", accent: (col?.vencido_total ?? 0) > 0 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#111", letterSpacing: "-.02em", lineHeight: 1.1 }}>
            Hola, {firstName}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/dashboard/quotes/new" className="btn-secondary" style={{ fontSize: 11 }}>Nueva cotización</Link>
          <Link href="/dashboard/clients/new" className="btn-primary"  style={{ fontSize: 11 }}>+ Nuevo cliente</Link>
        </div>
      </div>

      {/* KPIs — 2 cols mobile, 4 cols desktop */}
      <div className="kpi-grid">
        {kpis.map(k => (
          <Link
            key={k.label}
            href={k.href}
            className="card"
            style={{ padding: "16px 18px", textDecoration: "none", display: "block", transition: "border-color .15s, box-shadow .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#bbb"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#999", marginBottom: 10 }}>{k.label}</p>
            <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-.03em", color: k.accent ? "#e55c00" : "#111", lineHeight: 1 }}>{k.value}</p>
          </Link>
        ))}
      </div>

      {/* Middle section — 1 col mobile, 2 cols md+ */}
      <div className="two-col-grid">

        {/* Cartera aging */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="panel-header">
            <p className="panel-header-title">Cartera de crédito</p>
            <Link href="/dashboard/collections" className="panel-header-link">Ver todo →</Link>
          </div>
          {col && col.cartera_total > 0 ? (
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Al corriente", val: col.al_corriente, color: "#111" },
                { label: "1–15 días",    val: col.dias_1_15,    color: "#e55c00" },
                { label: "16–30 días",   val: col.dias_16_30,   color: "#c44a00" },
                { label: "31–60 días",   val: col.dias_31_60,   color: "#991500" },
                { label: "+60 días",     val: col.dias_60_plus, color: "#5c0000" },
              ].filter(r => r.val > 0).map(r => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "#777", width: 80, flexShrink: 0 }}>{r.label}</span>
                  <div style={{ flex: 1, height: 4, background: "#f0f0f0", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: r.color, borderRadius: 2, width: `${Math.min((r.val / col.cartera_total) * 100, 100)}%`, transition: "width .4s" }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: r.color, width: 76, textAlign: "right", flexShrink: 0 }}>
                    {formatCurrency(r.val)}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#999" }}>Total cartera</span>
                <span style={{ fontWeight: 800, color: "#111" }}>{formatCurrency(col.cartera_total)}</span>
              </div>
            </div>
          ) : (
            <p style={{ padding: "20px 16px", fontSize: 13, color: "#bbb" }}>Sin cartera de crédito activa</p>
          )}
        </div>

        {/* Inventario + alertas */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="panel-header">
            <p className="panel-header-title">Inventario</p>
            <Link href="/dashboard/inventory" className="panel-header-link">Ver todo →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderBottom: "1px solid #f0f0f0" }}>
            {[
              { label: "Productos",   val: stock?.total_products ?? "—", cls: "" },
              { label: "Bajo mínimo", val: stock?.below_min ?? "—",      cls: (stock?.below_min ?? 0) > 0 ? "warn" : "" },
              { label: "Sin stock",   val: stock?.zero_stock ?? "—",     cls: (stock?.zero_stock ?? 0) > 0 ? "danger" : "" },
            ].map(s => (
              <div key={s.label} className="stat-mini">
                <p className={`value ${s.cls}`}>{s.val}</p>
                <p className="lbl">{s.label}</p>
              </div>
            ))}
          </div>
          {alerts.length > 0 ? (
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#bbb", padding: "10px 16px 4px" }}>
                Alertas de stock
              </p>
              {alerts.slice(0, 4).map((a: any) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #f8f8f8" }}>
                  <p style={{ fontSize: 12, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 10 }}>{a.descripcion}</p>
                  <span style={{ fontSize: 12, fontWeight: 800, color: a.stock_actual <= 0 ? "#c00" : "#e55c00", flexShrink: 0 }}>
                    {a.stock_actual} {a.unidad_base}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ padding: "14px 16px", fontSize: 13, color: "#bbb" }}>Sin alertas de stock</p>
          )}
        </div>
      </div>

      {/* Bottom section — 1 col mobile, 2 cols md+ */}
      <div className="two-col-grid">

        {/* Vencidas recientes */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="panel-header">
            <p className="panel-header-title">Vencidas recientes</p>
            <Link href="/dashboard/collections?tab=overdue" className="panel-header-link">Ver todo →</Link>
          </div>
          {overdueList.length > 0 ? (
            <div>
              {overdueList.slice(0, 5).map((s: any) => (
                <Link
                  key={s.id}
                  href={`/dashboard/sales/${s.id}`}
                  className="mobile-row"
                  style={{ display: "flex", textDecoration: "none" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="folio">{s.folio}</p>
                    <p style={{ fontSize: 12, color: "#888", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.client_nombre}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: "#111" }}>{formatCurrency(s.saldo_pendiente)}</p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#c00", marginTop: 2 }}>+{s.dias_vencido}d</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ padding: "20px 16px", fontSize: 13, color: "#bbb" }}>Sin ventas vencidas ✓</p>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="panel-header">
            <p className="panel-header-title">Accesos rápidos</p>
          </div>
          {[
            { href: "/dashboard/quotes/new",    label: "Nueva cotización",      icon: "📋" },
            { href: "/dashboard/clients/new",   label: "Nuevo cliente",         icon: "👤" },
            { href: "/dashboard/purchases/new", label: "Nueva orden de compra", icon: "🛒" },
            { href: "/dashboard/inventory",     label: "Ver inventario",        icon: "📦" },
            { href: "/dashboard/collections",   label: "Reporte de cobranza",   icon: "💳" },
          ].map(a => (
            <Link
              key={a.href}
              href={a.href}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid #f8f8f8", fontSize: 13, fontWeight: 500, color: "#222", textDecoration: "none", transition: "background .1s", minHeight: 48 }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              <span style={{ flex: 1 }}>{a.label}</span>
              <ArrowRight style={{ width: 13, height: 13, color: "#ccc" }} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
