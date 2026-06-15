"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, ChevronLeft, ChevronRight, CreditCard, X } from "lucide-react";
import Link from "next/link";

interface Sale {
  id: number; folio: string; client_id: number; client_nombre: string | null;
  status: string; metodo_pago: string; total: number; saldo_pendiente: number; created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente", facturada: "Facturada", nota_venta: "Nota Venta",
  entregada: "Entregada", cancelada: "Cancelada",
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pendiente:   { bg: "#fef9c3", text: "#854d0e" },
  facturada:   { bg: "#dbeafe", text: "#1d4ed8" },
  nota_venta:  { bg: "#f3f4f6", text: "#374151" },
  entregada:   { bg: "#dcfce7", text: "#15803d" },
  cancelada:   { bg: "#fee2e2", text: "#b91c1c" },
};

const FILTERS = ["", "pendiente", "nota_venta", "facturada", "entregada", "cancelada"] as const;

export default function SalesPage() {
  const [status, setStatus] = useState("");
  const [page, setPage]     = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery<{ total: number; page: number; page_size: number; items: Sale[] }>({
    queryKey: ["sales", status, page, search],
    queryFn: () => api.get("/sales", { params: { status: status || undefined, page, page_size: 20, search: search || undefined } }).then(r => r.data),
  });

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  const StatusBadge = ({ s }: { s: string }) => {
    const c = STATUS_COLORS[s] ?? { bg: "#f3f4f6", text: "#374151" };
    return <span className="badge" style={{ background: c.bg, color: c.text }}>{STATUS_LABELS[s] ?? s}</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "#111", letterSpacing: "-.02em" }}>Ventas</h1>
        <p style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{data?.total ?? "—"} ventas registradas</p>
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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

        {/* ── Mobile card list ── */}
        <div className="md:hidden">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ height: 12, background: "#f0f0f0", borderRadius: 3, width: "40%", marginBottom: 8 }} />
                <div style={{ height: 10, background: "#f5f5f5", borderRadius: 3, width: "60%" }} />
              </div>
            ))
          ) : data?.items.length === 0 ? (
            <div className="empty-state">
              <CreditCard style={{ width: 32, height: 32, opacity: .3 }} />
              <p>{search ? `Sin resultados para "${search}"` : "Sin ventas"}</p>
            </div>
          ) : (
            data?.items.map(sale => (
              <Link key={sale.id} href={`/dashboard/sales/${sale.id}`} className="mobile-row" style={{ display: "flex", textDecoration: "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="folio" style={{ marginBottom: 3 }}>{sale.folio}</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sale.client_nombre ?? <span style={{ color: "#bbb" }}>Sin cliente</span>}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <StatusBadge s={sale.status} />
                    <span style={{ fontSize: 11, color: "#aaa" }}>{formatDate(sale.created_at)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0, marginLeft: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>{formatCurrency(sale.total)}</p>
                  {Number(sale.saldo_pendiente) > 0 && (
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#c00" }}>
                      Saldo: {formatCurrency(sale.saldo_pendiente)}
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* ── Desktop table ── */}
        <div className="hidden md:block overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                {["Folio","Cliente","Estado","Pago","Total","Saldo","Fecha",""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 16px", textAlign: i >= 4 && i <= 5 ? "right" : "left", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }}
                    className={i === 3 ? "hidden sm:table-cell" : i === 5 ? "hidden md:table-cell" : i === 6 ? "hidden lg:table-cell" : ""}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8f8f8" }}>
                    <td colSpan={8} style={{ padding: "12px 16px" }}>
                      <div style={{ height: 12, background: "#f5f5f5", borderRadius: 3 }} />
                    </td>
                  </tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <CreditCard style={{ width: 32, height: 32, opacity: .3 }} />
                    <p>{search ? `Sin resultados para "${search}"` : "Sin ventas"}</p>
                  </div>
                </td></tr>
              ) : (
                data?.items.map(sale => (
                  <tr key={sale.id} style={{ borderBottom: "1px solid #f8f8f8", transition: "background .1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "12px 16px" }}><span className="folio">{sale.folio}</span></td>
                    <td style={{ padding: "12px 16px", color: "#333", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sale.client_nombre ?? <span style={{ color: "#bbb" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}><StatusBadge s={sale.status} /></td>
                    <td style={{ padding: "12px 16px", color: "#666", textTransform: "capitalize" }} className="hidden sm:table-cell">{sale.metodo_pago}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#111" }}>{formatCurrency(sale.total)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }} className="hidden md:table-cell">
                      <span style={{ fontSize: 12, fontWeight: 700, color: Number(sale.saldo_pendiente) > 0 ? "#c00" : "#16a34a" }}>
                        {formatCurrency(sale.saldo_pendiente)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#888" }} className="hidden lg:table-cell">{formatDate(sale.created_at)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Link href={`/dashboard/sales/${sale.id}`} style={{ fontSize: 12, fontWeight: 600, color: "#e55c00", textDecoration: "none" }}>Ver →</Link>
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
            <span>{(page - 1) * data.page_size + 1}–{Math.min(page * data.page_size, data.total)} de {data.total}</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                style={{ padding: 8, borderRadius: 5, border: "1px solid #e4e4e4", background: "#fff", cursor: "pointer", display: "flex", opacity: page === 1 ? .4 : 1 }}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                style={{ padding: 8, borderRadius: 5, border: "1px solid #e4e4e4", background: "#fff", cursor: "pointer", display: "flex", opacity: page >= totalPages ? .4 : 1 }}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
