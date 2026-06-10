"use client";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Search, Upload, TrendingUp, Package, ChevronLeft, ChevronRight, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/lib/auth-store";

interface Product {
  id: number; clave: string; descripcion: string; departamento: string | null;
  categoria: string | null; precio_compra: number; peso_kg: number;
  unidad_venta: string; stock_actual: number; is_active: boolean; imagen_url: string | null;
}

interface PaginatedProducts { total: number; page: number; page_size: number; items: Product[]; }

const UNIT_LABELS: Record<string, string> = { pza: "Pza", kg: "Kg", ton: "Ton", metro: "mt", rollo: "Rollo" };

export default function ProductsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const canWrite = ["gerencia", "administracion", "compras"].includes(user?.role ?? "");

  const [q, setQ] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [categoria, setCategoria] = useState("");
  const [page, setPage] = useState(1);

  // bulk price update state
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [pctInput, setPctInput] = useState("");
  const [priceReason, setPriceReason] = useState("");

  // import state
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);

  const { data, isLoading } = useQuery<PaginatedProducts>({
    queryKey: ["products", q, departamento, categoria, page],
    queryFn: () => api.get("/products", { params: { q: q || undefined, departamento: departamento || undefined, categoria: categoria || undefined, page, page_size: 50 } }).then((r) => r.data),
  });

  const { data: cats } = useQuery<{ departamentos: string[]; categorias: string[] }>({
    queryKey: ["product-cats"],
    queryFn: () => api.get("/products/categories").then((r) => r.data),
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.post("/products/import/csv", fd).then((r) => r.data);
    },
    onSuccess: (result) => {
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Importación completada: ${result.created} nuevos, ${result.updated} actualizados`);
    },
    onError: () => toast.error("Error en la importación"),
  });

  const priceMutation = useMutation({
    mutationFn: (body: object) => api.post("/products/prices/bulk-update", body).then((r) => r.data),
    onSuccess: (result) => {
      setShowPriceModal(false);
      setPctInput("");
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Precios actualizados: ${result.updated} registros en ${result.product_count} productos`);
    },
    onError: () => toast.error("Error al actualizar precios"),
  });

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500">{data?.total ?? "—"} productos en catálogo</p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <button onClick={() => setShowPriceModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" /> Actualizar Precios
            </button>
            <button onClick={() => setShowImport(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4" /> Importar CSV
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por clave, descripción o tags... (Alt+P)"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input sm:w-48" value={departamento} onChange={(e) => { setDepartamento(e.target.value); setPage(1); }}>
          <option value="">Todos los depto.</option>
          {cats?.departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input sm:w-48" value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(1); }}>
          <option value="">Todas las cat.</option>
          {cats?.categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Clave</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Depto / Cat.</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">P. Compra</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Peso kg</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Unidad</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : data?.items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Sin productos</p>
                </td></tr>
              ) : data?.items.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-brand-700 font-medium">{p.clave}</td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate" title={p.descripcion}>{p.descripcion}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-gray-500">{p.departamento}</span>
                    {p.categoria && <> / <span className="text-xs text-gray-400">{p.categoria}</span></>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(p.precio_compra)}</td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{p.peso_kg}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="badge bg-gray-100 text-gray-700">{UNIT_LABELS[p.unidad_venta] ?? p.unidad_venta}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 hidden lg:table-cell">
                    <span className={p.stock_actual <= 0 ? "text-red-500" : ""}>{Number(p.stock_actual).toFixed(2)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

      {/* Bulk Price Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Actualización masiva de precios</h2>
              <button onClick={() => setShowPriceModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Porcentaje de ajuste</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ej. 5.5 para +5.5% o -3 para -3%"
                  className="input"
                  value={pctInput}
                  onChange={(e) => setPctInput(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Positivo = incremento, negativo = reducción</p>
              </div>
              <div>
                <label className="label">Filtrar por departamento (opcional)</label>
                <select className="input" id="dept-select">
                  <option value="">Todos</option>
                  {cats?.departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Motivo</label>
                <input className="input" placeholder="Ej. Ajuste por fluctuación del acero" value={priceReason} onChange={(e) => setPriceReason(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPriceModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  disabled={!pctInput || priceMutation.isPending}
                  onClick={() => {
                    const dept = (document.getElementById("dept-select") as HTMLSelectElement).value;
                    priceMutation.mutate({
                      porcentaje: parseFloat(pctInput),
                      departamentos: dept ? [dept] : undefined,
                      reason: priceReason || undefined,
                    });
                  }}
                  className="btn-primary flex-1 disabled:opacity-60"
                >
                  {priceMutation.isPending ? "Aplicando..." : "Aplicar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Importar productos</h2>
              <button onClick={() => { setShowImport(false); setImportFile(null); setImportResult(null); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {!importResult ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Sube un archivo CSV o Excel con el formato de SICAR. Se creará o actualizará cada producto por CLAVE.</p>
                <label className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-brand-400 transition-colors">
                  <Upload className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">{importFile ? importFile.name : "Haz clic o arrastra tu archivo aquí"}</p>
                  <p className="text-xs text-gray-400 mt-1">.csv, .xlsx, .xls</p>
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
                </label>
                <div className="flex gap-3">
                  <button onClick={() => { setShowImport(false); setImportFile(null); }} className="btn-secondary flex-1">Cancelar</button>
                  <button
                    disabled={!importFile || importMutation.isPending}
                    onClick={() => importFile && importMutation.mutate(importFile)}
                    className="btn-primary flex-1 disabled:opacity-60"
                  >
                    {importMutation.isPending ? "Importando..." : "Importar"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{importResult.created}</p>
                    <p className="text-xs text-green-600">Nuevos productos</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{importResult.updated}</p>
                    <p className="text-xs text-blue-600">Actualizados</p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="bg-red-50 rounded-xl p-3 max-h-32 overflow-y-auto">
                    <p className="text-xs font-medium text-red-700 mb-1">{importResult.errors.length} advertencias:</p>
                    {importResult.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                  </div>
                )}
                <button onClick={() => { setShowImport(false); setImportFile(null); setImportResult(null); }} className="btn-primary w-full">
                  Listo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
