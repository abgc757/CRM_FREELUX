"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, CheckCircle, Send, Package, X, Truck } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface OCItem {
  id: number; product_id: number | null; descripcion: string; unidad: string;
  cantidad_solicitada: number; cantidad_recibida: number; precio_unitario: number; subtotal: number;
}
interface PurchaseOrder {
  id: number; folio: string; supplier_id: number; status: string;
  subtotal: number; iva: number; total: number;
  fecha_requerida: string | null; notas: string | null; created_at: string;
  items: OCItem[];
}

const STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador", enviada: "Enviada", confirmada: "Confirmada",
  recibida_parcial: "Recepción parcial", recibida: "Recibida", cancelada: "Cancelada",
};
const STATUS_COLORS: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700", enviada: "bg-blue-100 text-blue-700",
  confirmada: "bg-purple-100 text-purple-700", recibida_parcial: "bg-yellow-100 text-yellow-700",
  recibida: "bg-green-100 text-green-700", cancelada: "bg-red-100 text-red-700",
};

function ReceiveModal({ order, onClose, onSuccess }: { order: PurchaseOrder; onClose: () => void; onSuccess: () => void }) {
  const pending = order.items.filter(i => i.cantidad_recibida < i.cantidad_solicitada);
  const [quantities, setQuantities] = useState<Record<number, string>>(
    Object.fromEntries(pending.map(i => [i.id, String(i.cantidad_solicitada - i.cantidad_recibida)]))
  );

  const mutation = useMutation({
    mutationFn: () => {
      const items_received = Object.entries(quantities)
        .filter(([, q]) => Number(q) > 0)
        .map(([item_id, cantidad_recibida]) => ({ item_id: Number(item_id), cantidad_recibida: Number(cantidad_recibida) }));
      return api.post(`/purchases/${order.id}/receive`, items_received).then(r => r.data);
    },
    onSuccess: () => { toast.success("Recepción registrada"); onSuccess(); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Truck className="h-4 w-4" /> Registrar Recepción</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-3 max-h-80 overflow-y-auto">
          {pending.map(item => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.descripcion}</p>
                <p className="text-xs text-gray-500">Pendiente: {item.cantidad_solicitada - item.cantidad_recibida} {item.unidad}</p>
              </div>
              <div className="flex items-center gap-1">
                <input type="number" step="0.01" min="0" max={item.cantidad_solicitada - item.cantidad_recibida}
                  value={quantities[item.id] ?? ""}
                  onChange={e => setQuantities(prev => ({ ...prev, [item.id]: e.target.value }))}
                  className="input w-24 text-right py-1 text-sm" />
                <span className="text-xs text-gray-500 w-8">{item.unidad}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary text-sm">
            {mutation.isPending ? "Guardando…" : "Confirmar recepción"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [receiveOpen, setReceiveOpen] = useState(false);

  const { data: order, isLoading } = useQuery<PurchaseOrder>({
    queryKey: ["purchase", id],
    queryFn: () => api.get(`/purchases/${id}`).then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/purchases/${id}`, { status }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase", id] }); qc.invalidateQueries({ queryKey: ["purchases"] }); toast.success("Estado actualizado"); },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;
  if (!order) return <div className="text-center py-20 text-gray-400">Orden no encontrada</div>;

  const canSend = order.status === "borrador";
  const canConfirm = order.status === "enviada";
  const canReceive = ["confirmada", "recibida_parcial"].includes(order.status);
  const canCancel = !["recibida", "cancelada"].includes(order.status);

  return (
    <div className="space-y-5 max-w-4xl">
      {receiveOpen && <ReceiveModal order={order} onClose={() => setReceiveOpen(false)} onSuccess={() => { qc.invalidateQueries({ queryKey: ["purchase", id] }); }} />}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/purchases" className="p-1.5 rounded hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono text-brand-700">{order.folio}</h1>
              <span className={`badge ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Creada {formatDate(order.created_at)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canSend && (
            <button onClick={() => statusMutation.mutate("enviada")} className="btn-secondary text-sm flex items-center gap-2">
              <Send className="h-4 w-4" /> Marcar enviada
            </button>
          )}
          {canConfirm && (
            <button onClick={() => statusMutation.mutate("confirmada")} className="btn-secondary text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Confirmar OC
            </button>
          )}
          {canReceive && (
            <button onClick={() => setReceiveOpen(true)} className="btn-primary text-sm flex items-center gap-2">
              <Package className="h-4 w-4" /> Registrar recepción
            </button>
          )}
          {canCancel && (
            <button onClick={() => { if (confirm("¿Cancelar esta OC?")) statusMutation.mutate("cancelada"); }}
              className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50">
              Cancelar OC
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500 mb-0.5">Proveedor ID</p><p className="font-semibold text-gray-900">#{order.supplier_id}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-0.5">Fecha requerida</p><p className="font-semibold text-gray-900">{order.fecha_requerida ? formatDate(order.fecha_requerida) : "—"}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-0.5">Subtotal</p><p className="font-semibold text-gray-900">{formatCurrency(order.subtotal)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-0.5">Total c/IVA</p><p className="font-semibold text-brand-700 text-lg">{formatCurrency(order.total)}</p></div>
      </div>

      {order.notas && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <p className="text-xs font-medium text-amber-700 mb-1">Notas</p>
          <p className="text-sm text-amber-900">{order.notas}</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Partidas</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Unidad</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Solicitado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Recibido</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">P. Unit.</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.items.map(item => {
                const pct = item.cantidad_solicitada > 0 ? (item.cantidad_recibida / item.cantidad_solicitada) * 100 : 0;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{item.descripcion}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.unidad}</td>
                    <td className="px-4 py-3 text-right">{item.cantidad_solicitada}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={item.cantidad_recibida >= item.cantidad_solicitada ? "text-green-700 font-medium" : item.cantidad_recibida > 0 ? "text-yellow-700" : "text-gray-500"}>
                        {item.cantidad_recibida}
                      </span>
                      <div className="h-1 bg-gray-100 rounded-full mt-1 w-16 ml-auto">
                        <div className="h-1 bg-green-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.precio_unitario)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right text-sm text-gray-600">Subtotal</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(order.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right text-sm text-gray-600">IVA (16%)</td>
                <td className="px-4 py-3 text-right">{formatCurrency(order.iva)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right font-bold text-gray-900">Total</td>
                <td className="px-4 py-3 text-right font-bold text-brand-700">{formatCurrency(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
