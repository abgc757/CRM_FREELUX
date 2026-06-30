"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  Truck, Plus, Search, X, ChevronLeft, ChevronRight,
  MapPin, User, Calendar, Package,
} from "lucide-react";
import Link from "next/link";

type DeliveryStatus = "pendiente" | "programado" | "en_ruta" | "entregado" | "cancelado";

interface Delivery {
  id: number; folio: string; client_id: number; client_nombre: string | null;
  sale_id: number | null; direccion_entrega: string; ciudad: string | null;
  fecha_programada: string | null; fecha_entrega_real: string | null;
  vehiculo_placa: string | null; operador_nombre: string | null;
  status: DeliveryStatus; notas: string | null; created_at: string;
}

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pendiente: "Pendiente", programado: "Programado",
  en_ruta: "En ruta", entregado: "Entregado", cancelado: "Cancelado",
};
const STATUS_COLORS: Record<DeliveryStatus, { bg: string; text: string }> = {
  pendiente:  { bg: "#fef9c3", text: "#854d0e" },
  programado: { bg: "#dbeafe", text: "#1d4ed8" },
  en_ruta:    { bg: "#fff7ed", text: "#c2410c" },
  entregado:  { bg: "#dcfce7", text: "#15803d" },
  cancelado:  { bg: "#fee2e2", text: "#b91c1c" },
};
const FILTERS: Array<DeliveryStatus | ""> = ["", "pendiente", "programado", "en_ruta", "entregado", "cancelado"];

export default function LogisticsPage() {
  const [status, setStatus] = useState<DeliveryStatus | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ total: number; page: number; page_size: number; items: Delivery[] }>({
    queryKey: ["deliveries", status, page],
    queryFn: () => api.get("/logistics/deliveries", {
      params: { status: status || undefined, page, page_size: 20 }
    }).then(r => r.data),
  });

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  const StatusBadge = ({ s }: { s: DeliveryStatus }) => {
    const c = STATUS_COLORS[s] ?? { bg: "#f3f4f6", text: "#374151" };
    return <span className="badge" style={{ background: c.bg, color: c.text }}>{STATUS_LABELS[s] ?? s}</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#111", letterSpacing: "-.02em" }}>Logística y Entregas</h1>
          <p style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{data?.total ?? "—"} pedidos registrados</p>
        </div>
        <Link href="/dashboard/logistics/new" className="btn-primary" style={{ fontSize: 11, gap: 6 }}>
          <Plus style={{ width: 14, height: 14 }} /> Nueva entrega
        </Link>
      </div>

      {/* Filters */}
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

      {/* Mobile cards */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="md:hidden">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ height: 12, background: "#f0f0f0", borderRadius: 3, width: "50%", marginBottom: 8 }} />
                <div style={{ height: 10, background: "#f5f5f5", borderRadius: 3, width: "70%" }} />
              </div>
            ))
          ) : !data?.items.length ? (
            <div className="empty-state">
              <Truck style={{ width: 32, height: 32, opacity: .3 }} />
              <p>Sin pedidos de entrega</p>
            </div>
          ) : data.items.map(d => (
            <Link key={d.id} href={`/dashboard/logistics/${d.id}`} className="mobile-row" style={{ textDecoration: "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="folio" style={{ marginBottom: 3 }}>{d.folio}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.client_nombre ?? "Sin cliente"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <StatusBadge s={d.status} />
                  {d.ciudad && <span style={{ fontSize: 11, color: "#aaa" }}>{d.ciudad}</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0, marginLeft: 12, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                {d.fecha_programada && (
                  <span style={{ fontSize: 11, color: "#666", fontWeight: 600 }}>
                    {formatDate(d.fecha_programada)}
                  </span>
                )}
                {d.vehiculo_placa && (
                  <span style={{ fontSize: 10, color: "#aaa" }}>{d.vehiculo_placa}</span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                {["Folio", "Cliente", "Dirección", "Fecha prog.", "Vehículo", "Operador", "Estado", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }}
                    className={i === 2 ? "hidden lg:table-cell" : i === 5 ? "hidden xl:table-cell" : ""}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8f8f8" }}>
                    <td colSpan={8} style={{ padding: "12px 16px" }}>
                      <div style={{ height: 12, background: "#f5f5f5", borderRadius: 3 }} />
                    </td>
                  </tr>
                ))
              ) : !data?.items.length ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <Truck style={{ width: 32, height: 32, opacity: .3 }} />
                    <p>Sin pedidos de entrega</p>
                  </div>
                </td></tr>
              ) : data.items.map(d => (
                <tr key={d.id} style={{ borderBottom: "1px solid #f8f8f8", transition: "background .1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 16px" }}><span className="folio">{d.folio}</span></td>
                  <td style={{ padding: "12px 16px", color: "#333", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.client_nombre ?? <span style={{ color: "#bbb" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#666", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="hidden lg:table-cell">
                    {d.ciudad ? `${d.ciudad} — ` : ""}{d.direccion_entrega}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#555", whiteSpace: "nowrap" }}>
                    {d.fecha_programada ? formatDate(d.fecha_programada) : <span style={{ color: "#ccc" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#666" }}>
                    {d.vehiculo_placa ?? <span style={{ color: "#ccc" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#666" }} className="hidden xl:table-cell">
                    {d.operador_nombre ?? <span style={{ color: "#ccc" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge s={d.status} /></td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <Link href={`/dashboard/logistics/${d.id}`} style={{ fontSize: 12, fontWeight: 600, color: "#e55c00", textDecoration: "none" }}>Ver →</Link>
                  </td>
                </tr>
              ))}
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
