"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Users, ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import Link from "next/link";

interface Client {
  id: number; nombre: string; rfc: string | null; tipo: string;
  telefono: string | null; whatsapp: string | null;
  credito_activo: boolean; saldo_pendiente: number; limite_credito: number;
  seller_id: number | null; is_active: boolean;
}

const TIPO_LABELS: Record<string, string> = {
  publico_general: "Público Gral.",
  contratista: "Contratista",
  constructora: "Constructora",
  mayorista: "Mayorista",
};

const TIPO_COLORS: Record<string, string> = {
  publico_general: "bg-gray-100 text-gray-700",
  contratista: "bg-blue-100 text-blue-700",
  constructora: "bg-purple-100 text-purple-700",
  mayorista: "bg-amber-100 text-amber-700",
};

export default function ClientsPage() {
  const { user } = useAuthStore();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ total: number; page: number; page_size: number; items: Client[] }>({
    queryKey: ["clients", q, page],
    queryFn: () => api.get("/clients", { params: { q: q || undefined, page, page_size: 50 } }).then((r) => r.data),
  });

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">{data?.total ?? "—"} clientes registrados</p>
        </div>
        <Link href="/dashboard/clients/new" className="btn-primary flex items-center gap-2 text-sm w-fit">
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          className="input pl-9 max-w-md"
          placeholder="Buscar por nombre, RFC o teléfono..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">RFC</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Contacto</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Crédito</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Sin clientes</p>
                </td></tr>
              ) : data?.items.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/clients/${c.id}`} className="font-medium text-gray-900 hover:text-brand-600">{c.nombre}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">{c.rfc ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${TIPO_COLORS[c.tipo]}`}>{TIPO_LABELS[c.tipo]}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{c.telefono ?? c.whatsapp ?? "—"}</td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    {c.credito_activo ? (
                      <div className="flex items-center justify-end gap-1 text-green-600">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span className="text-xs">{formatCurrency(c.limite_credito)}</span>
                      </div>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    {c.credito_activo ? (
                      <span className={Number(c.saldo_pendiente) > 0 ? "text-red-600 font-medium text-xs" : "text-green-600 text-xs"}>
                        {formatCurrency(c.saldo_pendiente)}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.total > data.page_size && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>Mostrando {(page - 1) * data.page_size + 1}–{Math.min(page * data.page_size, data.total)} de {data.total}</span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
