"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, ShoppingCart, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import Link from "next/link";

interface PurchaseOrder {
  id: number; folio: string; supplier_id: number; status: string;
  total: number; fecha_requerida: string | null; created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador", enviada: "Enviada", confirmada: "Confirmada",
  recibida_parcial: "Parcial", recibida: "Recibida", cancelada: "Cancelada",
};
const STATUS_COLORS: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700", enviada: "bg-blue-100 text-blue-700",
  confirmada: "bg-purple-100 text-purple-700", recibida_parcial: "bg-yellow-100 text-yellow-700",
  recibida: "bg-green-100 text-green-700", cancelada: "bg-red-100 text-red-700",
};

export default function PurchasesPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ total: number; page: number; page_size: number; items: PurchaseOrder[] }>({
    queryKey: ["purchases", status, page],
    queryFn: () => api.get("/purchases", { params: { status: status || undefined, page, page_size: 50 } }).then(r => r.data),
  });

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Órdenes de Compra</h1>
          <p className="text-sm text-gray-500">{data?.total ?? "—"} órdenes registradas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/purchases/suppliers" className="btn-secondary text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Proveedores
          </Link>
          <Link href="/dashboard/purchases/new" className="btn-primary text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nueva OC
          </Link>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", "borrador", "enviada", "confirmada", "recibida_parcial", "recibida", "cancelada"].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${status === s ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s ? STATUS_LABELS[s] : "Todas"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Folio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Fecha requerida</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Creada</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>Sin órdenes de compra</p>
                </td></tr>
              ) : data?.items.map(oc => (
                <tr key={oc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-brand-700">{oc.folio}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[oc.status]}`}>{STATUS_LABELS[oc.status]}</span></td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(oc.total)}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{oc.fecha_requerida ? formatDate(oc.fecha_requerida) : "—"}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatDate(oc.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/purchases/${oc.id}`} className="text-xs text-brand-600 hover:underline">Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.total > data.page_size && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>Mostrando {(page-1)*data.page_size+1}–{Math.min(page*data.page_size, data.total)} de {data.total}</span>
            <div className="flex gap-1">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page>=totalPages} onClick={() => setPage(p=>p+1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
