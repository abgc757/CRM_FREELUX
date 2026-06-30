"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Truck, MapPin, User, Calendar, Package, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

type DeliveryStatus = "pendiente" | "programado" | "en_ruta" | "entregado" | "cancelado";
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
const NEXT_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  pendiente: "programado", programado: "en_ruta", en_ruta: "entregado",
};

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [updating, setUpdating] = useState(false);

  const { data: delivery, isLoading } = useQuery<any>({
    queryKey: ["delivery", id],
    queryFn: () => api.get(`/logistics/deliveries/${id}`).then(r => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: (status: DeliveryStatus) =>
      api.patch(`/logistics/deliveries/${id}/status`, {
        status,
        fecha_entrega_real: status === "entregado" ? new Date().toISOString().split("T")[0] : undefined,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery", id] });
      qc.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });

  if (isLoading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 20, height: 80, background: "#f5f5f5", borderRadius: 6 }} />
      ))}
    </div>
  );

  if (!delivery) return (
    <div className="empty-state">
      <Truck style={{ width: 32, height: 32, opacity: .3 }} />
      <p>Pedido no encontrado</p>
      <Link href="/dashboard/logistics" className="btn-secondary" style={{ marginTop: 8 }}>Volver</Link>
    </div>
  );

  const c = STATUS_COLORS[delivery.status as DeliveryStatus] ?? { bg: "#f3f4f6", text: "#374151" };
  const nextStatus = NEXT_STATUS[delivery.status as DeliveryStatus];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics" style={{ color: "#999", display: "flex", alignItems: "center", textDecoration: "none" }}>
          <ArrowLeft style={{ width: 16, height: 16 }} />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "#111" }}>{delivery.folio}</h1>
            <span className="badge" style={{ background: c.bg, color: c.text }}>
              {STATUS_LABELS[delivery.status as DeliveryStatus] ?? delivery.status}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Creado {formatDate(delivery.created_at)}</p>
        </div>

        {/* Acciones de estado */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {nextStatus && (
            <button
              onClick={() => updateStatus.mutate(nextStatus)}
              disabled={updateStatus.isPending}
              className="btn-primary"
              style={{ fontSize: 11 }}
            >
              <CheckCircle style={{ width: 13, height: 13 }} />
              Marcar como {STATUS_LABELS[nextStatus]}
            </button>
          )}
          {delivery.status !== "cancelado" && delivery.status !== "entregado" && (
            <button
              onClick={() => updateStatus.mutate("cancelado")}
              disabled={updateStatus.isPending}
              className="btn-secondary"
              style={{ fontSize: 11, color: "#c00" }}
            >
              <XCircle style={{ width: 13, height: 13 }} /> Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="two-col-grid">
        {/* Datos de entrega */}
        <div className="card" style={{ padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#aaa", marginBottom: 12 }}>
            Datos de entrega
          </p>
          <dl style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              ["Cliente", delivery.client_nombre],
              ["Dirección", delivery.direccion_entrega],
              ["Ciudad", delivery.ciudad],
              ["Contacto", delivery.contacto_entrega],
              ["Teléfono", delivery.telefono_entrega],
            ].map(([label, value]) => value ? (
              <div key={label as string} style={{ display: "flex", gap: 8 }}>
                <dt style={{ fontSize: 11, color: "#aaa", fontWeight: 600, minWidth: 80, flexShrink: 0 }}>{label}</dt>
                <dd style={{ fontSize: 12, color: "#333", fontWeight: 500 }}>{value}</dd>
              </div>
            ) : null)}
          </dl>
        </div>

        {/* Asignación */}
        <div className="card" style={{ padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#aaa", marginBottom: 12 }}>
            Asignación
          </p>
          <dl style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              ["Vehículo", delivery.vehiculo_placa],
              ["Operador", delivery.operador_nombre],
              ["Fecha programada", delivery.fecha_programada ? formatDate(delivery.fecha_programada) : null],
              ["Fecha entregada", delivery.fecha_entrega_real ? formatDate(delivery.fecha_entrega_real) : null],
              ["Venta vinculada", delivery.sale_id ? `VTA-${String(delivery.sale_id).padStart(6,"0")}` : null],
            ].map(([label, value]) => value ? (
              <div key={label as string} style={{ display: "flex", gap: 8 }}>
                <dt style={{ fontSize: 11, color: "#aaa", fontWeight: 600, minWidth: 110, flexShrink: 0 }}>{label}</dt>
                <dd style={{ fontSize: 12, color: "#333", fontWeight: 500 }}>{value}</dd>
              </div>
            ) : null)}
          </dl>
          {delivery.notas && (
            <div style={{ marginTop: 12, padding: "8px 10px", background: "#f9f9f9", borderRadius: 4, fontSize: 12, color: "#555" }}>
              {delivery.notas}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      {delivery.items?.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="panel-header">
            <span className="panel-header-title">
              <Package style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
              Artículos a entregar
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                {["Descripción", "Cantidad", "Unidad"].map(h => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#aaa" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {delivery.items.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f8f8f8" }}>
                  <td style={{ padding: "10px 16px", color: "#333" }}>{item.descripcion}</td>
                  <td style={{ padding: "10px 16px", fontWeight: 700, color: "#111" }}>{Number(item.cantidad).toLocaleString("es-MX")}</td>
                  <td style={{ padding: "10px 16px", color: "#666" }}>{item.unidad ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
