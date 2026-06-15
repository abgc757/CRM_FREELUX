"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Users, ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import Link from "next/link";

interface Client {
  id: number; nombre: string; rfc: string | null; tipo: string;
  telefono: string | null; whatsapp: string | null;
  credito_activo: boolean; saldo_pendiente: number; limite_credito: number;
  seller_id: number | null; is_active: boolean;
}

const TIPO_LABELS: Record<string, string> = {
  publico_general: "Público Gral.",
  contratista:     "Contratista",
  constructora:    "Constructora",
  mayorista:       "Mayorista",
};

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  publico_general: { bg: "#f3f4f6", text: "#374151" },
  contratista:     { bg: "#dbeafe", text: "#1d4ed8" },
  constructora:    { bg: "#f3e8ff", text: "#7e22ce" },
  mayorista:       { bg: "#fef3c7", text: "#92400e" },
};

const FILTERS = ["", "publico_general", "contratista", "constructora", "mayorista"] as const;

export default function ClientsPage() {
  const [q, setQ]       = useState("");
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState("");

  const { data, isLoading } = useQuery<{ total: number; page: number; page_size: number; items: Client[] }>({
    queryKey: ["clients", q, page, tipo],
    queryFn: () => api.get("/clients", { params: { q: q || undefined, page, page_size: 50, tipo: tipo || undefined } }).then(r => r.data),
  });

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  const TipoBadge = ({ t }: { t: string }) => {
    const c = TIPO_COLORS[t] ?? { bg: "#f3f4f6", text: "#374151" };
    return <span className="badge" style={{ background: c.bg, color: c.text }}>{TIPO_LABELS[t] ?? t}</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#111", letterSpacing: "-.02em" }}>Clientes</h1>
          <p style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{data?.total ?? "—"} clientes registrados</p>
        </div>
        <Link href="/dashboard/clients/new" className="btn-primary" style={{ fontSize: 11, gap: 6 }}>
          <Plus style={{ width: 14, height: 14 }} /> Nuevo cliente
        </Link>
      </div>

      {/* Search + tipo filter */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="search-wrap" style={{ maxWidth: 400 }}>
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, RFC o teléfono…"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            className="input"
          />
        </div>

        <div className="filter-bar">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setTipo(f); setPage(1); }}
              className={`filter-pill ${tipo === f ? "filter-pill-active" : "filter-pill-inactive"}`}
            >
              {f ? TIPO_LABELS[f] : "Todos"}
            </button>
          ))}
        </div>
      </div>

      {/* Content card */}
      <div className="card" style={{ overflow: "hidden" }}>

        {/* ── Mobile card list ── */}
        <div className="md:hidden">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ height: 12, background: "#f0f0f0", borderRadius: 3, width: "55%", marginBottom: 8 }} />
                <div style={{ height: 10, background: "#f5f5f5", borderRadius: 3, width: "35%" }} />
              </div>
            ))
          ) : data?.items.length === 0 ? (
            <div className="empty-state">
              <Users style={{ width: 32, height: 32, opacity: .3 }} />
              <p>{q ? `Sin resultados para "${q}"` : "Sin clientes"}</p>
            </div>
          ) : (
            data?.items.map(c => (
              <Link key={c.id} href={`/dashboard/clients/${c.id}`} className="mobile-row" style={{ display: "flex", textDecoration: "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                    {c.nombre}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TipoBadge t={c.tipo} />
                    {c.rfc && <span style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>{c.rfc}</span>}
                  </div>
                  {(c.telefono || c.whatsapp) && (
                    <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{c.telefono ?? c.whatsapp}</p>
                  )}
                </div>
                {c.credito_activo && (
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    <p style={{ fontSize: 11, color: "#888" }}>Saldo</p>
                    <p style={{ fontSize: 13, fontWeight: 800, color: Number(c.saldo_pendiente) > 0 ? "#c00" : "#16a34a" }}>
                      {formatCurrency(c.saldo_pendiente)}
                    </p>
                  </div>
                )}
              </Link>
            ))
          )}
        </div>

        {/* ── Desktop table ── */}
        <div className="hidden md:block overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }}>Nombre</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }} className="hidden lg:table-cell">RFC</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }}>Tipo</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }} className="hidden md:table-cell">Contacto</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }} className="hidden lg:table-cell">Límite</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }} className="hidden lg:table-cell">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8f8f8" }}>
                    <td colSpan={6} style={{ padding: "12px 16px" }}>
                      <div style={{ height: 12, background: "#f5f5f5", borderRadius: 3 }} />
                    </td>
                  </tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <Users style={{ width: 32, height: 32, opacity: .3 }} />
                    <p>{q ? `Sin resultados para "${q}"` : "Sin clientes"}</p>
                  </div>
                </td></tr>
              ) : (
                data?.items.map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f8f8f8", transition: "background .1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/dashboard/clients/${c.id}`} style={{ fontWeight: 600, color: "#111", textDecoration: "none" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#e55c00")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#111")}>
                        {c.nombre}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#888", fontFamily: "monospace", fontSize: 12 }} className="hidden lg:table-cell">
                      {c.rfc ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}><TipoBadge t={c.tipo} /></td>
                    <td style={{ padding: "12px 16px", color: "#666" }} className="hidden md:table-cell">
                      {c.telefono ?? c.whatsapp ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }} className="hidden lg:table-cell">
                      {c.credito_activo ? (
                        <span style={{ fontSize: 12, color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                          <CreditCard style={{ width: 13, height: 13 }} />
                          {formatCurrency(c.limite_credito)}
                        </span>
                      ) : <span style={{ fontSize: 12, color: "#ccc" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }} className="hidden lg:table-cell">
                      {c.credito_activo ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: Number(c.saldo_pendiente) > 0 ? "#c00" : "#16a34a" }}>
                          {formatCurrency(c.saldo_pendiente)}
                        </span>
                      ) : <span style={{ fontSize: 12, color: "#ccc" }}>—</span>}
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
