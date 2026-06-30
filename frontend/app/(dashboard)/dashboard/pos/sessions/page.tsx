"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Lock, Unlock, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Session {
  id: number; folio: string; cajero_nombre: string | null; status: string;
  fondo_inicial: number; total_ventas: number; total_efectivo: number;
  total_tarjeta: number; total_transferencia: number; num_transacciones: number;
  efectivo_contado: number | null; diferencia: number | null;
  opened_at: string; closed_at: string | null;
}

export default function SessionsPage() {
  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["pos-sessions"],
    queryFn: () => api.get("/pos/sessions", { params: { page: 1, page_size: 50 } }).then(r => r.data),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/dashboard/pos" style={{ color: "#999", display: "flex", textDecoration: "none" }}>
          <ArrowLeft style={{ width: 16, height: 16 }} />
        </Link>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#111", letterSpacing: "-.02em" }}>Sesiones de caja</h1>
          <p style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Historial de turnos y cortes</p>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {/* Mobile */}
        <div className="md:hidden">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ height: 12, background: "#f0f0f0", borderRadius: 3, width: "40%", marginBottom: 8 }} />
                <div style={{ height: 10, background: "#f5f5f5", borderRadius: 3, width: "60%" }} />
              </div>
            ))
          ) : !sessions?.length ? (
            <div className="empty-state">
              <Lock style={{ width: 28, height: 28, opacity: .3 }} />
              <p>Sin sesiones registradas</p>
            </div>
          ) : sessions.map(s => (
            <div key={s.id} style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p className="folio" style={{ marginBottom: 3 }}>{s.folio}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{s.cajero_nombre}</p>
                <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{formatDate(s.opened_at)}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="badge" style={s.status === "abierta" ? { background: "#dcfce7", color: "#15803d" } : { background: "#f3f4f6", color: "#374151" }}>
                  {s.status === "abierta" ? "Abierta" : "Cerrada"}
                </span>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#111", marginTop: 6 }}>{formatCurrency(s.total_ventas)}</p>
                <p style={{ fontSize: 10, color: "#aaa" }}>{s.num_transacciones} ventas</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                {["Folio", "Cajero", "Estado", "Apertura", "Cierre", "Fondo", "Efectivo", "Tarjeta", "Transfer.", "Total", "Transac.", "Diferencia"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", textAlign: i >= 5 ? "right" : "left", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#aaa" }}
                    className={i >= 6 && i <= 8 ? "hidden lg:table-cell" : i === 11 ? "hidden xl:table-cell" : ""}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8f8f8" }}>
                    <td colSpan={12} style={{ padding: "12px 14px" }}>
                      <div style={{ height: 12, background: "#f5f5f5", borderRadius: 3 }} />
                    </td>
                  </tr>
                ))
              ) : !sessions?.length ? (
                <tr><td colSpan={12}>
                  <div className="empty-state">
                    <Lock style={{ width: 28, height: 28, opacity: .3 }} />
                    <p>Sin sesiones registradas</p>
                  </div>
                </td></tr>
              ) : sessions.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #f8f8f8" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "11px 14px" }}><span className="folio">{s.folio}</span></td>
                  <td style={{ padding: "11px 14px", color: "#333" }}>{s.cajero_nombre}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span className="badge" style={s.status === "abierta" ? { background: "#dcfce7", color: "#15803d" } : { background: "#f3f4f6", color: "#374151" }}>
                      {s.status === "abierta" ? "Abierta" : "Cerrada"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", color: "#555", whiteSpace: "nowrap" }}>{formatDate(s.opened_at)}</td>
                  <td style={{ padding: "11px 14px", color: "#555", whiteSpace: "nowrap" }}>
                    {s.closed_at ? formatDate(s.closed_at) : <span style={{ color: "#ccc" }}>—</span>}
                  </td>
                  <td style={{ padding: "11px 14px", textAlign: "right", color: "#666" }}>{formatCurrency(s.fondo_inicial)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", color: "#666" }} className="hidden lg:table-cell">{formatCurrency(s.total_efectivo)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", color: "#666" }} className="hidden lg:table-cell">{formatCurrency(s.total_tarjeta)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", color: "#666" }} className="hidden lg:table-cell">{formatCurrency(s.total_transferencia)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 800, color: "#111" }}>{formatCurrency(s.total_ventas)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", color: "#666" }}>{s.num_transacciones}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right" }} className="hidden xl:table-cell">
                    {s.diferencia !== null ? (
                      <span style={{ fontWeight: 700, color: s.diferencia === 0 ? "#16a34a" : s.diferencia > 0 ? "#1d4ed8" : "#c00" }}>
                        {s.diferencia > 0 ? "+" : ""}{formatCurrency(s.diferencia)}
                      </span>
                    ) : <span style={{ color: "#ccc" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
