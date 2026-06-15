"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, Plus, FileText, ChevronLeft, ChevronRight, X, ChevronRight as Arrow } from "lucide-react";
import Link from "next/link";

interface Quote {
  id: number; folio: string; client_id: number; client_nombre: string | null;
  seller_id: number; status: string; total: number; created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador", enviada: "Enviada", aprobada: "Aprobada",
  convertida: "Convertida", cancelada: "Cancelada",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  borrador:   { bg: "#f3f4f6", text: "#374151" },
  enviada:    { bg: "#dbeafe", text: "#1d4ed8" },
  aprobada:   { bg: "#dcfce7", text: "#15803d" },
  convertida: { bg: "#f3e8ff", text: "#7e22ce" },
  cancelada:  { bg: "#fee2e2", text: "#b91c1c" },
};

const FILTERS = ["", "borrador", "enviada", "aprobada", "convertida", "cancelada"] as const;

export default function QuotesPage() {
  const [status, setStatus] = useState("");
  const [page, setPage]     = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery<{ total: number; page: number; page_size: number; items: Quote[] }>({
    queryKey: ["quotes", status, page, search],
    queryFn: () => api.get("/quotes", { params: { status: status || undefined, page, page_size: 20, search: search || undefined } }).then(r => r.data),
  });

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  const StatusBadge = ({ s }: { s: string }) => {
    const c = STATUS_COLORS[s] ?? { bg: "#f3f4f6", text: "#374151" };
    return (
      <span className="badge" style={{ background: c.bg, color: c.text }}>
        {STATUS_LABELS[s] ?? s}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#111", letterSpacing: "-.02em" }}>Cotizaciones</h1>
          <p style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{data?.total ?? "—"} cotizaciones</p>
        </div>
        <Link href="/dashboard/quotes/new" className="btn-primary" style={{ fontSize: 11, gap: 6 }}>
          <Plus style={{ width: 14, height: 14 }} /> Nueva cotización
        </Link>
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Search */}
        <div className="search-wrap" style={{ maxWidth: 400 }}>
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por folio o cliente…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="input"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#999", display: "flex" }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        {/* Filter pills — horizontal scroll on mobile */}
        <div className="filter-bar">
          {FILTERS.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`filter-pill ${status === s ? "filter-pill-active" : "filter-pill-inactive"}`}
            >
              {s ? STATUS_LABELS[s] : "Todas"}
            </button>
          ))}
        </div>
      </div>

      {/* Content card */}
      <div className="card" style={{ overflow: "hidden" }}>

        {/* ── Mobile card list (hidden md+) ── */}
        <div className="md:hidden">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ height: 12, background: "#f0f0f0", borderRadius: 3, width: "40%", marginBottom: 8, animation: "pulse 1.5s ease infinite" }} />
                <div style={{ height: 10, background: "#f5f5f5", borderRadius: 3, width: "70%" }} />
              </div>
            ))
          ) : data?.items.length === 0 ? (
            <div className="empty-state">
              <FileText style={{ width: 32, height: 32, opacity: .3 }} />
              <p>{search ? `Sin resultados para "${search}"` : "Sin cotizaciones"}</p>
            </div>
          ) : (
            data?.items.map(q => (
              <Link key={q.id} href={`/dashboard/quotes/${q.id}`} className="mobile-row" style={{ display: "flex", textDecoration: "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="folio" style={{ marginBottom: 3 }}>{q.folio}</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {q.client_nombre ?? <span style={{ color: "#bbb" }}>Sin cliente</span>}
                  </p>
                  <p style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>{formatDate(q.created_at)}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, marginLeft: 12 }}>
                  <StatusBadge s={q.status} />
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>{formatCurrency(q.total)}</p>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* ── Desktop table (hidden on mobile) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }}>Folio</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }}>Cliente</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }}>Estado</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }}>Total</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }} className="hidden lg:table-cell">Fecha</th>
                <th style={{ padding: "10px 16px" }} />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8f8f8" }}>
                    <td colSpan={6} style={{ padding: "12px 16px" }}>
                      <div style={{ height: 12, background: "#f5f5f5", borderRadius: 3 }} />
                    </td>
                  </tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <FileText style={{ width: 32, height: 32, opacity: .3 }} />
                      <p>{search ? `Sin resultados para "${search}"` : "Sin cotizaciones"}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.items.map(q => (
                  <tr key={q.id} style={{ borderBottom: "1px solid #f8f8f8", transition: "background .1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "12px 16px" }}><span className="folio">{q.folio}</span></td>
                    <td style={{ padding: "12px 16px", color: "#333", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {q.client_nombre ?? <span style={{ color: "#bbb" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}><StatusBadge s={q.status} /></td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#111" }}>{formatCurrency(q.total)}</td>
                    <td style={{ padding: "12px 16px", color: "#888" }} className="hidden lg:table-cell">{formatDate(q.created_at)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Link href={`/dashboard/quotes/${q.id}`} style={{ fontSize: 12, fontWeight: 600, color: "#e55c00", textDecoration: "none" }}>Ver →</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > data.page_size && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #f0f0f0", fontSize: 12, color: "#888" }}>
            <span>
              {(page - 1) * data.page_size + 1}–{Math.min(page * data.page_size, data.total)} de {data.total}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={{ padding: 8, borderRadius: 5, border: "1px solid #e4e4e4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", opacity: page === 1 ? .4 : 1 }}
              >
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: 8, borderRadius: 5, border: "1px solid #e4e4e4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", opacity: page >= totalPages ? .4 : 1 }}
              >
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
