"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AlertTriangle, TrendingDown, CheckCircle, Clock, ChevronDown, ChevronRight, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";

/* ── Types ── */
interface CollectionsSummary {
  cartera_total: number; al_corriente: number; vencido_total: number;
  dias_1_15: number; dias_16_30: number; dias_31_60: number; dias_60_plus: number;
  num_clientes_vencidos: number; num_ventas_vencidas: number;
}
interface ClientAgingRow {
  client_id: number; client_nombre: string; rfc: string | null;
  telefono: string | null; whatsapp: string | null;
  dias_credito: number; limite_credito: number; saldo_total: number;
  al_corriente: number; dias_1_15: number; dias_16_30: number;
  dias_31_60: number; dias_60_plus: number; num_facturas_vencidas: number;
}
interface AgingReport {
  fecha_corte: string;
  totales: { al_corriente: number; dias_1_15: number; dias_16_30: number; dias_31_60: number; dias_60_plus: number; total: number };
  clientes: ClientAgingRow[];
}
interface OverdueSale {
  id: number; folio: string; client_id: number; client_nombre: string;
  total: number; saldo_pendiente: number; fecha_vencimiento: string | null;
  dias_vencido: number; created_at: string;
}

/* ── Credit Modal ── */
function CreditModal({ client, onClose }: { client: ClientAgingRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ credito_activo: true, limite_credito: String(client.limite_credito), dias_credito: String(client.dias_credito) });

  const mutation = useMutation({
    mutationFn: () => api.patch(`/collections/client/${client.client_id}/credit`, {
      credito_activo: form.credito_activo,
      limite_credito: Number(form.limite_credito),
      dias_credito: Number(form.dias_credito),
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aging"] });
      qc.invalidateQueries({ queryKey: ["collections-summary"] });
      toast.success("Crédito actualizado");
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-sm text-gray-900">Ajustar crédito — {client.client_nombre}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.credito_activo} onChange={e => setForm(f => ({ ...f, credito_activo: e.target.checked }))} className="w-4 h-4 accent-brand-600" />
            <span className="text-sm font-medium text-gray-800">Crédito activo</span>
          </label>
          <div>
            <label className="label">Límite de crédito (MXN)</label>
            <input type="number" step="100" value={form.limite_credito} onChange={e => setForm(f => ({ ...f, limite_credito: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Días de crédito</label>
            <input type="number" value={form.dias_credito} onChange={e => setForm(f => ({ ...f, dias_credito: e.target.value }))} className="input" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary text-sm">
            {mutation.isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Aging Table Row ── */
function AgingRow({ row, total }: { row: ClientAgingRow; total: number }) {
  const [expanded, setExpanded] = useState(false);
  const [creditModal, setCreditModal] = useState(false);
  const hasOverdue = row.num_facturas_vencidas > 0;

  const { data: detail } = useQuery({
    queryKey: ["client-credit", row.client_id],
    queryFn: () => api.get(`/collections/client/${row.client_id}`).then(r => r.data),
    enabled: expanded,
  });

  const pct = total > 0 ? (row.saldo_total / total) * 100 : 0;

  return (
    <>
      {creditModal && <CreditModal client={row} onClose={() => setCreditModal(false)} />}
      <tr className={`border-t border-gray-50 hover:bg-gray-50 ${hasOverdue ? "bg-red-50/30" : ""}`}>
        <td className="px-4 py-3">
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 text-left">
            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
            <div>
              <p className="text-sm font-medium text-gray-900">{row.client_nombre}</p>
              {row.rfc && <p className="text-xs text-gray-400 font-mono">{row.rfc}</p>}
            </div>
          </button>
        </td>
        <td className="px-3 py-3 text-right text-sm font-medium text-gray-800">{formatCurrency(row.saldo_total)}</td>
        <td className="px-3 py-3 text-right text-sm text-green-700">{row.al_corriente > 0 ? formatCurrency(row.al_corriente) : "—"}</td>
        <td className="px-3 py-3 text-right text-sm text-yellow-600">{row.dias_1_15 > 0 ? formatCurrency(row.dias_1_15) : "—"}</td>
        <td className="px-3 py-3 text-right text-sm text-orange-600">{row.dias_16_30 > 0 ? formatCurrency(row.dias_16_30) : "—"}</td>
        <td className="px-3 py-3 text-right text-sm text-red-600">{row.dias_31_60 > 0 ? formatCurrency(row.dias_31_60) : "—"}</td>
        <td className="px-3 py-3 text-right text-sm font-bold text-red-800">{row.dias_60_plus > 0 ? formatCurrency(row.dias_60_plus) : "—"}</td>
        <td className="px-3 py-3 text-right text-xs text-gray-500">{pct.toFixed(1)}%</td>
        <td className="px-3 py-3 text-right">
          <button onClick={() => setCreditModal(true)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>
      {expanded && detail && (
        <tr>
          <td colSpan={9} className="px-8 py-3 bg-gray-50 border-t border-gray-100">
            <div className="space-y-2">
              <div className="flex items-center gap-6 text-xs text-gray-600 mb-2">
                <span>Límite: <strong>{formatCurrency(detail.client.limite_credito)}</strong></span>
                <span>Disponible: <strong className="text-green-700">{formatCurrency(detail.client.disponible)}</strong></span>
                <span>Utilización: <strong>{detail.client.utilizacion_pct}%</strong></span>
                <span>Plazo: <strong>{detail.client.dias_credito} días</strong></span>
                {row.telefono && <span>Tel: <strong>{row.telefono}</strong></span>}
                {row.whatsapp && <span>WA: <strong>{row.whatsapp}</strong></span>}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left pb-1">Folio</th>
                    <th className="text-right pb-1">Total</th>
                    <th className="text-right pb-1">Saldo</th>
                    <th className="text-right pb-1">Vence</th>
                    <th className="text-right pb-1">Días vencido</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.ventas_abiertas.map((v: any) => (
                    <tr key={v.id} className={v.dias_vencido > 0 ? "text-red-700" : "text-gray-700"}>
                      <td className="py-0.5 font-mono">{v.folio}</td>
                      <td className="py-0.5 text-right">{formatCurrency(v.total)}</td>
                      <td className="py-0.5 text-right font-medium">{formatCurrency(v.saldo_pendiente)}</td>
                      <td className="py-0.5 text-right">{v.fecha_vencimiento ? formatDate(v.fecha_vencimiento) : "—"}</td>
                      <td className="py-0.5 text-right">{v.dias_vencido > 0 ? <span className="text-red-700 font-bold">+{v.dias_vencido}d</span> : <span className="text-green-700">Al corriente</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Main Page ── */
export default function CollectionsPage() {
  const [tab, setTab] = useState<"aging" | "overdue">("aging");
  const [fechaCorte, setFechaCorte] = useState("");

  const { data: summary, isLoading: loadSum } = useQuery<CollectionsSummary>({
    queryKey: ["collections-summary"],
    queryFn: () => api.get("/collections/summary").then(r => r.data),
  });

  const { data: aging, isLoading: loadAging } = useQuery<AgingReport>({
    queryKey: ["aging", fechaCorte],
    queryFn: () => api.get("/collections/aging", { params: fechaCorte ? { fecha_corte: fechaCorte } : {} }).then(r => r.data),
    enabled: tab === "aging",
  });

  const { data: overdue = [], isLoading: loadOver } = useQuery<OverdueSale[]>({
    queryKey: ["overdue"],
    queryFn: () => api.get("/collections/overdue").then(r => r.data),
    enabled: tab === "overdue",
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cobranza y Crédito</h1>
          <p className="text-sm text-gray-500">Cartera de clientes con crédito activo</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Cartera total</p>
          <p className="text-xl font-bold text-gray-900">{loadSum ? "—" : formatCurrency(summary?.cartera_total ?? 0)}</p>
        </div>
        <div className="card p-4 bg-green-50 border-green-200">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" />Al corriente</p>
          <p className="text-xl font-bold text-green-700">{loadSum ? "—" : formatCurrency(summary?.al_corriente ?? 0)}</p>
        </div>
        <div className="card p-4 bg-red-50 border-red-200">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-600" />Vencido</p>
          <p className="text-xl font-bold text-red-700">{loadSum ? "—" : formatCurrency(summary?.vencido_total ?? 0)}</p>
          <p className="text-xs text-red-500 mt-0.5">{summary?.num_ventas_vencidas ?? 0} ventas · {summary?.num_clientes_vencidos ?? 0} clientes</p>
        </div>
        <div className="card p-4 bg-amber-50 border-amber-200">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><TrendingDown className="h-3 w-3 text-amber-600" />+60 días</p>
          <p className="text-xl font-bold text-amber-700">{loadSum ? "—" : formatCurrency(summary?.dias_60_plus ?? 0)}</p>
        </div>
      </div>

      {/* Breakdown bar */}
      {summary && summary.cartera_total > 0 && (
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Distribución de cartera</p>
          <div className="flex h-4 rounded-full overflow-hidden gap-px">
            {[
              { key: "al_corriente", color: "bg-green-500", label: "Al corriente" },
              { key: "dias_1_15", color: "bg-yellow-400", label: "1-15d" },
              { key: "dias_16_30", color: "bg-orange-400", label: "16-30d" },
              { key: "dias_31_60", color: "bg-red-500", label: "31-60d" },
              { key: "dias_60_plus", color: "bg-red-800", label: "+60d" },
            ].map(({ key, color, label }) => {
              const val = summary[key as keyof CollectionsSummary] as number;
              const pct = (val / summary.cartera_total) * 100;
              if (pct < 0.5) return null;
              return (
                <div key={key} title={`${label}: ${formatCurrency(val)} (${pct.toFixed(1)}%)`}
                  className={`${color} transition-all`} style={{ width: `${pct}%` }} />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
            {[
              { label: "Al corriente", color: "bg-green-500", val: summary.al_corriente },
              { label: "1-15 días", color: "bg-yellow-400", val: summary.dias_1_15 },
              { label: "16-30 días", color: "bg-orange-400", val: summary.dias_16_30 },
              { label: "31-60 días", color: "bg-red-500", val: summary.dias_31_60 },
              { label: "+60 días", color: "bg-red-800", val: summary.dias_60_plus },
            ].map(({ label, color, val }) => val > 0 && (
              <span key={label} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />{label}: {formatCurrency(val)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["aging", "overdue"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {t === "aging" ? `Reporte aging${aging ? ` (${aging.clientes.length} clientes)` : ""}` : `Cartera vencida${overdue.length ? ` (${overdue.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* Aging Report */}
      {tab === "aging" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Fecha de corte:</label>
            <input type="date" value={fechaCorte} onChange={e => setFechaCorte(e.target.value)}
              className="input w-44 text-sm py-1.5" />
            {fechaCorte && <button onClick={() => setFechaCorte("")} className="text-xs text-brand-600 hover:underline">Hoy</button>}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="text-right px-3 py-3 font-medium text-gray-600">Saldo total</th>
                    <th className="text-right px-3 py-3 font-medium text-green-700">Al corriente</th>
                    <th className="text-right px-3 py-3 font-medium text-yellow-600">1-15 días</th>
                    <th className="text-right px-3 py-3 font-medium text-orange-600">16-30 días</th>
                    <th className="text-right px-3 py-3 font-medium text-red-600">31-60 días</th>
                    <th className="text-right px-3 py-3 font-medium text-red-800">+60 días</th>
                    <th className="text-right px-3 py-3 font-medium text-gray-500">%</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {loadAging ? (
                    Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
                  ) : aging?.clientes.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" /><p>Sin cartera pendiente</p>
                    </td></tr>
                  ) : aging?.clientes.map(row => (
                    <AgingRow key={row.client_id} row={row} total={aging.totales.total} />
                  ))}
                </tbody>
                {aging && aging.clientes.length > 0 && (
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-bold text-sm">
                    <tr>
                      <td className="px-4 py-3 text-gray-700">Totales</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(aging.totales.total)}</td>
                      <td className="px-3 py-3 text-right text-green-700">{formatCurrency(aging.totales.al_corriente)}</td>
                      <td className="px-3 py-3 text-right text-yellow-600">{formatCurrency(aging.totales.dias_1_15)}</td>
                      <td className="px-3 py-3 text-right text-orange-600">{formatCurrency(aging.totales.dias_16_30)}</td>
                      <td className="px-3 py-3 text-right text-red-600">{formatCurrency(aging.totales.dias_31_60)}</td>
                      <td className="px-3 py-3 text-right text-red-800">{formatCurrency(aging.totales.dias_60_plus)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Overdue detail */}
      {tab === "overdue" && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Folio</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Venció</th>
                  <th className="text-right px-4 py-3 font-medium text-red-600">Días vencido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadOver ? (
                  Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
                ) : overdue.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" /><p>Sin ventas vencidas</p>
                  </td></tr>
                ) : overdue.map(s => {
                  const urgency = s.dias_vencido > 60 ? "bg-red-50 text-red-900" : s.dias_vencido > 30 ? "text-red-700" : s.dias_vencido > 15 ? "text-orange-600" : "text-yellow-700";
                  return (
                    <tr key={s.id} className={`hover:bg-gray-50 ${s.dias_vencido > 60 ? "bg-red-50/40" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-brand-700">{s.folio}</td>
                      <td className="px-4 py-3 text-gray-800">{s.client_nombre}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(s.total)}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatCurrency(s.saldo_pendiente)}</td>
                      <td className="px-4 py-3 text-gray-500">{s.fecha_vencimiento ? formatDate(s.fecha_vencimiento) : "—"}</td>
                      <td className={`px-4 py-3 text-right font-bold ${urgency}`}>+{s.dias_vencido}d</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
