"use client";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, openFile } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, FileText, CheckCircle, ShoppingBag, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useState } from "react";

interface QuoteDetail {
  id: number; folio: string; client_id: number; seller_id: number; status: string;
  notas: string | null; condiciones_pago: string | null; vigencia_dias: number;
  subtotal: number; iva: number; total: number; pdf_url: string | null; created_at: string;
  items: { id: number; descripcion: string; cantidad: number; unidad: string; precio_unitario: number; descuento_pct: number; subtotal: number; tiene_iva: boolean; }[];
}

const STATUS_LABELS: Record<string, string> = { borrador:"Borrador", enviada:"Enviada", aprobada:"Aprobada", convertida:"Convertida", cancelada:"Cancelada" };
const STATUS_COLORS: Record<string, string> = { borrador:"bg-gray-100 text-gray-700", enviada:"bg-blue-100 text-blue-700", aprobada:"bg-green-100 text-green-700", convertida:"bg-purple-100 text-purple-700", cancelada:"bg-red-100 text-red-700" };

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showConvert, setShowConvert] = useState(false);
  const [metodoPago, setMetodoPago] = useState("contado");

  const { data: quote, isLoading } = useQuery<QuoteDetail>({
    queryKey: ["quote", id],
    queryFn: () => api.get(`/quotes/${id}`).then(r => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/quotes/${id}`, { status }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quote", id] }); toast.success("Estado actualizado"); },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const genPdf = useMutation({
    mutationFn: () => api.post(`/documents/quotes/${id}/pdf`).then(r => r.data),
    onSuccess: async (data) => {
      qc.invalidateQueries({ queryKey: ["quote", id] });
      try { await openFile(data.url); } catch { toast.error("Error al abrir el PDF"); }
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error generando PDF"),
  });

  const convertSale = useMutation({
    mutationFn: () => api.post("/sales", { quote_id: Number(id), metodo_pago: metodoPago }).then(r => r.data),
    onSuccess: (data) => { toast.success(`Venta ${data.folio} creada`); router.push(`/dashboard/sales/${data.id}`); },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;
  if (!quote) return <p className="text-gray-500">No encontrado</p>;

  const canEdit = !["convertida","cancelada"].includes(quote.status);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/quotes" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{quote.folio}</h1>
              <span className={`badge ${STATUS_COLORS[quote.status]}`}>{STATUS_LABELS[quote.status]}</span>
            </div>
            <p className="text-sm text-gray-500">{formatDate(quote.created_at)} · Vigencia: {quote.vigencia_dias} días</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canEdit && quote.status === "borrador" && (
            <button onClick={() => updateStatus.mutate("enviada")} className="btn-secondary text-sm flex items-center gap-1.5">
              <Send className="h-4 w-4" /> Enviar
            </button>
          )}
          {canEdit && quote.status === "enviada" && (
            <button onClick={() => updateStatus.mutate("aprobada")} className="btn-secondary text-sm flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" /> Aprobar
            </button>
          )}
          <button onClick={() => genPdf.mutate()} disabled={genPdf.isPending} className="btn-secondary text-sm flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> {genPdf.isPending ? "Generando..." : "PDF"}
          </button>
          {quote.status === "aprobada" && (
            <button onClick={() => setShowConvert(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4" /> Convertir a Venta
            </button>
          )}
          {canEdit && (
            <button onClick={() => updateStatus.mutate("cancelada")} className="text-sm text-red-500 hover:text-red-700 px-2">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Partidas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Descripción</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">Cant.</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 text-xs">Unid.</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">P. Unit.</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">Desc.</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quote.items.map(item => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-gray-900">{item.descripcion}</td>
                  <td className="px-3 py-2 text-right">{item.cantidad}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{item.unidad}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.precio_unitario)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{item.descuento_pct > 0 ? `${item.descuento_pct}%` : "—"}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
          <div className="w-52 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(quote.subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>IVA (16%)</span><span>{formatCurrency(quote.iva)}</span></div>
            <div className="flex justify-between font-bold text-base text-gray-900 pt-1 border-t border-gray-200">
              <span>Total</span><span className="text-brand-600">{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(quote.notas || quote.condiciones_pago) && (
        <div className="card text-sm text-gray-600 space-y-1">
          {quote.condiciones_pago && <p><strong>Condiciones:</strong> {quote.condiciones_pago}</p>}
          {quote.notas && <p><strong>Notas:</strong> {quote.notas}</p>}
        </div>
      )}

      {/* Convert modal */}
      {showConvert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">Convertir a Venta</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Método de pago</label>
                <select className="input" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito (30 días)</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>
              <p className="text-sm text-gray-500">Total a generar: <strong className="text-brand-600">{formatCurrency(quote.total)}</strong></p>
              <div className="flex gap-3">
                <button onClick={() => setShowConvert(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={() => convertSale.mutate()} disabled={convertSale.isPending} className="btn-primary flex-1 disabled:opacity-60">
                  {convertSale.isPending ? "Procesando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
