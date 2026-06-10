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
const STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-700",
  facturada: "bg-blue-100 text-blue-700",
  nota_venta: "bg-gray-100 text-gray-700",
  entregada: "bg-green-100 text-green-700",
  cancelada: "bg-red-100 text-red-700",
};

export default function SalesPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce: enviar búsqueda 350ms después del último keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery<{ total: number; page: number; page_size: number; items: Sale[] }>({
    queryKey: ["sales", status, page, search],
    queryFn: () =>
      api.get("/sales", {
        params: { status: status || undefined, page, page_size: 20, search: search || undefined },
      }).then((r) => r.data),
  });

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500">{data?.total ?? "—"} ventas registradas</p>
        </div>
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Campo de búsqueda */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por folio o cliente..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-gray-400"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtros de estado */}
        <div className="flex gap-2 flex-wrap">
          {["", "pendiente", "nota_venta", "facturada", "entregada", "cancelada"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                status === s ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s ? STATUS_LABELS[s] : "Todas"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Folio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Pago</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Saldo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>{search ? `Sin resultados para "${search}"` : "Sin ventas"}</p>
                  </td>
                </tr>
              ) : (
                data?.items.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-brand-700">{sale.folio}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">
                      {sale.client_nombre ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_COLORS[sale.status]}`}>{STATUS_LABELS[sale.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize hidden sm:table-cell">{sale.metodo_pago}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(sale.total)}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className={Number(sale.saldo_pendiente) > 0 ? "text-red-600 font-medium text-xs" : "text-green-600 text-xs"}>
                        {formatCurrency(sale.saldo_pendiente)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatDate(sale.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/sales/${sale.id}`} className="text-xs text-brand-600 hover:underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {data && data.total > data.page_size && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>
              Mostrando {(page - 1) * data.page_size + 1}–{Math.min(page * data.page_size, data.total)} de {data.total}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
