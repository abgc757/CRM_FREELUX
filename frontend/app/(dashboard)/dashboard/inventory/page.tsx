"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, Plus, X, ChevronLeft, ChevronRight, Package } from "lucide-react";
import toast from "react-hot-toast";

interface Movement {
  id: number; product_id: number; tipo: string; cantidad: number;
  stock_antes: number; stock_despues: number; referencia: string | null;
  notas: string | null; created_at: string;
}
interface StockAlert { id: number; codigo: string; descripcion: string; stock_actual: number; stock_min: number; unidad_base: string; }
interface Product { id: number; codigo: string; descripcion: string; }

const TIPO_LABELS: Record<string, string> = {
  entrada: "Entrada", salida: "Salida", ajuste_positivo: "Ajuste +",
  ajuste_negativo: "Ajuste âˆ’", devolucion: "DevoluciÃ³n",
};
const TIPO_COLORS: Record<string, string> = {
  entrada: "text-green-700", salida: "text-red-700",
  ajuste_positivo: "text-blue-700", ajuste_negativo: "text-orange-700", devolucion: "text-purple-700",
};

const movSchema = z.object({
  product_id: z.coerce.number().min(1, "Selecciona producto"),
  tipo: z.enum(["entrada", "salida", "ajuste_positivo", "ajuste_negativo", "devolucion"]),
  cantidad: z.coerce.number().positive("Debe ser > 0"),
  referencia: z.string().optional(),
  notas: z.string().optional(),
});
type MovForm = z.infer<typeof movSchema>;

function MovementModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [prodSearch, setProdSearch] = useState("");
  const [prodResults, setProdResults] = useState<Product[]>([]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<MovForm>({
    resolver: zodResolver(movSchema),
    defaultValues: { tipo: "ajuste_positivo" },
  });

  const searchProds = async (q: string) => {
    setProdSearch(q);
    if (q.length < 2) { setProdResults([]); return; }
    const res = await api.get("/products", { params: { q, page_size: 8 } });
    setProdResults(res.data.items);
  };

  const mutation = useMutation({
    mutationFn: (data: MovForm) => api.post("/inventory/movements", data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["stock-alerts"] });
      qc.invalidateQueries({ queryKey: ["stock-summary"] });
      toast.success("Movimiento registrado");
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Registrar movimiento</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <div className="px-6 py-4 space-y-4">
            <div className="relative">
              <label className="label">Producto *</label>
              <input value={prodSearch} onChange={e => searchProds(e.target.value)} className="input" placeholder="Buscar por cÃ³digo o descripciÃ³nâ€¦" />
              {prodResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {prodResults.map(p => (
                    <button key={p.id} type="button" onClick={() => { setValue("product_id", p.id); setProdSearch(p.descripcion); setProdResults([]); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                      <span className="font-mono text-brand-700 mr-2 text-xs">{p.codigo}</span>{p.descripcion}
                    </button>
                  ))}
                </div>
              )}
              {errors.product_id && <p className="text-xs text-red-500 mt-1">{errors.product_id.message}</p>}
            </div>
            <div>
              <label className="label">Tipo de movimiento *</label>
              <select {...register("tipo")} className="input">
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="ajuste_positivo">Ajuste positivo</option>
                <option value="ajuste_negativo">Ajuste negativo</option>
                <option value="devolucion">DevoluciÃ³n</option>
              </select>
            </div>
            <div>
              <label className="label">Cantidad *</label>
              <input type="number" step="0.01" {...register("cantidad")} className="input" />
              {errors.cantidad && <p className="text-xs text-red-500 mt-1">{errors.cantidad.message}</p>}
            </div>
            <div>
              <label className="label">Referencia</label>
              <input {...register("referencia")} className="input" placeholder="Folio de OC, venta, etc." />
            </div>
            <div>
              <label className="label">Notas</label>
              <textarea {...register("notas")} rows={2} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary text-sm">
              {mutation.isPending ? "Guardandoâ€¦" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [movModal, setMovModal] = useState(false);
  const [tab, setTab] = useState<"movements" | "alerts">("movements");

  const { data: movData, isLoading: loadMov } = useQuery<{ total: number; page: number; page_size: number; items: Movement[] }>({
    queryKey: ["movements", page],
    queryFn: () => api.get("/inventory/movements", { params: { page, page_size: 50 } }).then(r => r.data),
    enabled: tab === "movements",
  });

  const { data: alerts = [], isLoading: loadAlerts } = useQuery<StockAlert[]>({
    queryKey: ["stock-alerts"],
    queryFn: () => api.get("/inventory/alerts").then(r => r.data),
    enabled: tab === "alerts",
  });

  const { data: stockSummary } = useQuery<{ total_products: number; below_min: number; zero_stock: number }>({
    queryKey: ["stock-summary"],
    queryFn: () => api.get("/inventory/stock").then(r => r.data),
  });

  const totalPages = movData ? Math.ceil(movData.total / movData.page_size) : 1;

  return (
    <div className="space-y-5">
      {movModal && <MovementModal onClose={() => setMovModal(false)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500">Movimientos y alertas de stock</p>
        </div>
        <button onClick={() => setMovModal(true)} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Registrar movimiento
        </button>
      </div>

      {stockSummary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stockSummary.total_products}</p>
            <p className="text-xs text-gray-500 mt-0.5">Productos activos</p>
          </div>
          <div className={`card p-4 text-center ${stockSummary.below_min > 0 ? "bg-amber-50 border-amber-200" : ""}`}>
            <p className={`text-2xl font-bold ${stockSummary.below_min > 0 ? "text-amber-700" : "text-gray-900"}`}>{stockSummary.below_min}</p>
            <p className="text-xs text-gray-500 mt-0.5">Bajo mÃ­nimo</p>
          </div>
          <div className={`card p-4 text-center ${stockSummary.zero_stock > 0 ? "bg-red-50 border-red-200" : ""}`}>
            <p className={`text-2xl font-bold ${stockSummary.zero_stock > 0 ? "text-red-700" : "text-gray-900"}`}>{stockSummary.zero_stock}</p>
            <p className="text-xs text-gray-500 mt-0.5">Sin stock</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(["movements", "alerts"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {t === "movements" ? `Movimientos${movData ? ` (${movData.total})` : ""}` : `Alertas${alerts.length ? ` (${alerts.length})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "movements" && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Cantidad</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Antes</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">DespuÃ©s</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Referencia</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadMov ? (
                  Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
                ) : movData?.items.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>Sin movimientos registrados</p>
                  </td></tr>
                ) : movData?.items.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className={`px-4 py-3 font-medium ${TIPO_COLORS[m.tipo]}`}>{TIPO_LABELS[m.tipo]}</td>
                    <td className="px-4 py-3 text-right font-mono">{m.cantidad > 0 ? "+" : ""}{m.cantidad}</td>
                    <td className="px-4 py-3 text-right text-gray-500 font-mono">{m.stock_antes}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{m.stock_despues}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell font-mono text-xs">{m.referencia ?? "â€”"}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatDate(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {movData && movData.total > movData.page_size && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>Mostrando {(page-1)*movData.page_size+1}â€“{Math.min(page*movData.page_size, movData.total)} de {movData.total}</span>
              <div className="flex gap-1">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                <button disabled={page>=totalPages} onClick={() => setPage(p=>p+1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "alerts" && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">CÃ³digo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">DescripciÃ³n</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Stock actual</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Stock mÃ­nimo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadAlerts ? (
                  Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
                ) : alerts.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>Sin alertas de stock</p>
                  </td></tr>
                ) : alerts.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-brand-700 font-medium">{a.codigo}</td>
                    <td className="px-4 py-3 text-gray-800">{a.descripcion}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${a.stock_actual <= 0 ? "text-red-700" : "text-amber-700"}`}>
                      {a.stock_actual} {a.unidad_base}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">{a.stock_min} {a.unidad_base}</td>
                    <td className="px-4 py-3">
                      {a.stock_actual <= 0
                        ? <span className="badge bg-red-100 text-red-700">Sin stock</span>
                        : <span className="badge bg-amber-100 text-amber-700">Bajo mÃ­nimo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

