"use client";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, openFile } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, FileText, Printer, Receipt, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useState } from "react";

interface SaleDetail {
  id: number; folio: string; client_id: number; seller_id: number; status: string;
  metodo_pago: string; subtotal: number; iva: number; total: number; saldo_pendiente: number;
  cfdi_uuid: string|null; cfdi_pdf_url: string|null; cfdi_xml_url: string|null;
  remision_url: string|null; notas: string|null; created_at: string;
  payments: { id:number; monto:number; metodo:string; referencia:string|null; created_at:string; }[];
}

const STATUS_COLORS: Record<string, string> = { pendiente:"bg-yellow-100 text-yellow-700", facturada:"bg-blue-100 text-blue-700", nota_venta:"bg-gray-100 text-gray-700", entregada:"bg-green-100 text-green-700", cancelada:"bg-red-100 text-red-700" };
const STATUS_LABELS: Record<string, string> = { pendiente:"Pendiente", facturada:"Facturada", nota_venta:"Nota Venta", entregada:"Entregada", cancelada:"Cancelada" };

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [payMonto, setPayMonto] = useState("");
  const [payMetodo, setPayMetodo] = useState("transferencia");
  const [payRef, setPayRef] = useState("");

  const { data: sale, isLoading } = useQuery<SaleDetail>({
    queryKey: ["sale", id],
    queryFn: () => api.get(`/sales/${id}`).then(r => r.data),
  });

  const genNota = useMutation({
    mutationFn: () => api.post(`/documents/sales/${id}/nota-venta`).then(r => r.data),
    onSuccess: async (data) => {
      toast.success("Nota de venta generada");
      try { await openFile(data.url); } catch { toast.error("Error al abrir el archivo"); }
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const genRemision = useMutation({
    mutationFn: () => api.post(`/documents/sales/${id}/remision`).then(r => r.data),
    onSuccess: async (data) => {
      qc.invalidateQueries({ queryKey: ["sale", id] });
      toast.success("Remisión generada");
      try { await openFile(data.url); } catch { toast.error("Error al abrir el archivo"); }
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const genCfdi = useMutation({
    mutationFn: () => api.post(`/documents/sales/${id}/cfdi`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sale", id] });
      toast.success(data.mock ? `CFDI simulado (sandbox): ${data.uuid}` : `CFDI timbrado: ${data.uuid}`);
    },
    onError: (e: any) => {
      const detail: string = e.response?.data?.detail ?? "Error emitiendo CFDI";
      const msg = detail.includes("401")
        ? "Facturama 401: credenciales inválidas o cuenta sin RFC emisor configurado"
        : detail;
      toast.error(msg);
    },
  });

  const registerPayment = useMutation({
    mutationFn: () => api.post(`/sales/${id}/payments`, { monto: parseFloat(payMonto), metodo: payMetodo, referencia: payRef || undefined }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sale", id] });
      setShowPayment(false); setPayMonto(""); setPayRef("");
      toast.success("Pago registrado");
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;
  if (!sale) return <p className="text-gray-500">No encontrado</p>;

  const pagado = sale.total - sale.saldo_pendiente;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/sales" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono text-gray-900">{sale.folio}</h1>
              <span className={`badge ${STATUS_COLORS[sale.status]}`}>{STATUS_LABELS[sale.status]}</span>
            </div>
            <p className="text-sm text-gray-500">{formatDate(sale.created_at)} · {sale.metodo_pago}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => genNota.mutate()} disabled={genNota.isPending} className="btn-secondary text-sm flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> Nota de Venta
          </button>
          <button onClick={() => genRemision.mutate()} disabled={genRemision.isPending} className="btn-secondary text-sm flex items-center gap-1.5">
            <Printer className="h-4 w-4" /> Remisión
          </button>
          {!sale.cfdi_uuid && (
            <button onClick={() => genCfdi.mutate()} disabled={genCfdi.isPending} className="btn-primary text-sm flex items-center gap-1.5">
              <Receipt className="h-4 w-4" /> {genCfdi.isPending ? "Timbrando..." : "Emitir CFDI"}
            </button>
          )}
        </div>
      </div>

      {/* CFDI info */}
      {sale.cfdi_uuid && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm flex flex-wrap gap-4 items-center">
          <div><span className="text-blue-600 font-medium">UUID:</span> <span className="font-mono text-xs">{sale.cfdi_uuid}</span></div>
          {sale.cfdi_xml_url && (
            <button onClick={() => openFile(`/api/v1/documents/sales/${id}/cfdi/download?tipo=xml`).catch(() => toast.error("Error al abrir XML"))}
              className="text-blue-600 hover:underline text-xs">
              XML CFDI
            </button>
          )}
          {sale.cfdi_pdf_url && (
            <button onClick={() => openFile(`/api/v1/documents/sales/${id}/cfdi/download?tipo=pdf`).catch(() => toast.error("Error al abrir PDF"))}
              className="text-blue-600 hover:underline text-xs">
              PDF CFDI
            </button>
          )}
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: formatCurrency(sale.total), color: "text-gray-900" },
          { label: "Pagado", value: formatCurrency(pagado), color: "text-green-600" },
          { label: "Saldo pendiente", value: formatCurrency(sale.saldo_pendiente), color: sale.saldo_pendiente > 0 ? "text-red-600" : "text-green-600" },
        ].map(c => (
          <div key={c.label} className="card text-center">
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Payments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Pagos registrados</h2>
          {sale.saldo_pendiente > 0 && (
            <button onClick={() => setShowPayment(true)} className="btn-primary text-xs flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Registrar pago
            </button>
          )}
        </div>
        {sale.payments.length === 0 ? (
          <p className="text-sm text-gray-400">Sin pagos registrados</p>
        ) : (
          <div className="space-y-2">
            {sale.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-4 py-2.5">
                <div>
                  <span className="font-medium text-gray-900 capitalize">{p.metodo}</span>
                  {p.referencia && <span className="text-gray-400 ml-2 text-xs">Ref: {p.referencia}</span>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{formatCurrency(p.monto)}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remisión link */}
      {sale.remision_url && (
        <div className="card flex items-center justify-between text-sm">
          <span className="text-gray-600">Remisión generada</span>
          <button
            onClick={() => openFile(sale.remision_url!).catch(() => toast.error("Error al abrir remisión"))}
            className="text-brand-600 hover:underline flex items-center gap-1">
            <Printer className="h-4 w-4" /> Ver remisión
          </button>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Registrar pago</h2>
              <button onClick={() => setShowPayment(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Monto</label>
                <input type="number" className="input" placeholder={`Máx ${formatCurrency(sale.saldo_pendiente)}`} value={payMonto} onChange={e => setPayMonto(e.target.value)} />
              </div>
              <div>
                <label className="label">Método</label>
                <select className="input" value={payMetodo} onChange={e => setPayMetodo(e.target.value)}>
                  {["transferencia","efectivo","cheque","contado"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Referencia (opcional)</label>
                <input className="input" placeholder="No. transferencia, cheque..." value={payRef} onChange={e => setPayRef(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPayment(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={() => registerPayment.mutate()} disabled={!payMonto || registerPayment.isPending} className="btn-primary flex-1 disabled:opacity-60">
                  {registerPayment.isPending ? "Guardando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
