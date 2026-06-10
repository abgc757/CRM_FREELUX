"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Supplier { id: number; nombre: string; rfc: string | null; }
interface Product { id: number; codigo: string; descripcion: string; unidad_base: string; }

const lineSchema = z.object({
  product_id: z.number().min(1, "Selecciona producto"),
  descripcion: z.string().min(1, "Requerido"),
  cantidad_solicitada: z.coerce.number().positive("Debe ser > 0"),
  unidad: z.string().min(1, "Requerido"),
  precio_unitario: z.coerce.number().min(0),
});

const schema = z.object({
  supplier_id: z.coerce.number().min(1, "Selecciona proveedor"),
  fecha_requerida: z.string().optional(),
  notas: z.string().optional(),
  items: z.array(lineSchema).min(1, "Agrega al menos un producto"),
});
type FormValues = z.infer<typeof schema>;

export default function NewPurchasePage() {
  const router = useRouter();
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});
  const [productResults, setProductResults] = useState<Record<number, Product[]>>({});

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/suppliers").then(r => r.data),
  });

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ product_id: 0, descripcion: "", cantidad_solicitada: 1, unidad: "pza", precio_unitario: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items = watch("items");
  const subtotal = items.reduce((s, i) => s + (Number(i.cantidad_solicitada) || 0) * (Number(i.precio_unitario) || 0), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const searchProducts = useCallback(async (idx: number, q: string) => {
    setProductSearch(prev => ({ ...prev, [idx]: q }));
    if (q.length < 2) { setProductResults(prev => ({ ...prev, [idx]: [] })); return; }
    const res = await api.get("/products", { params: { q, page_size: 8 } });
    setProductResults(prev => ({ ...prev, [idx]: res.data.items }));
  }, []);

  const selectProduct = (idx: number, prod: Product) => {
    setValue(`items.${idx}.product_id`, prod.id);
    setValue(`items.${idx}.descripcion`, prod.descripcion);
    setValue(`items.${idx}.unidad`, prod.unidad_base);
    setProductSearch(prev => ({ ...prev, [idx]: prod.descripcion }));
    setProductResults(prev => ({ ...prev, [idx]: [] }));
  };

  const mutation = useMutation({
    mutationFn: (data: FormValues) => api.post("/purchases", data).then(r => r.data),
    onSuccess: (oc) => { toast.success(`OC ${oc.folio} creada`); router.push(`/dashboard/purchases/${oc.id}`); },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error al crear OC"),
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/purchases" className="p-1.5 rounded hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold text-gray-900">Nueva Orden de Compra</h1>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
        <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Proveedor *</label>
            <select {...register("supplier_id")} className="input">
              <option value="">Seleccionar proveedorâ€¦</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.rfc ? ` (${s.rfc})` : ""}</option>)}
            </select>
            {errors.supplier_id && <p className="text-xs text-red-500 mt-1">{errors.supplier_id.message}</p>}
          </div>
          <div>
            <label className="label">Fecha requerida</label>
            <input type="date" {...register("fecha_requerida")} className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Notas internas</label>
            <textarea {...register("notas")} rows={2} className="input" placeholder="Instrucciones especiales, condiciones de entregaâ€¦" />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Partidas</h2>
            <button type="button" onClick={() => append({ product_id: 0, descripcion: "", cantidad_solicitada: 1, unidad: "pza", precio_unitario: 0 })}
              className="btn-secondary text-xs flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Agregar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-72">Producto</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">Unidad</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Cantidad</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">P. Unitario</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Subtotal</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => {
                  const qty = Number(items[idx]?.cantidad_solicitada) || 0;
                  const pu = Number(items[idx]?.precio_unitario) || 0;
                  return (
                    <tr key={field.id} className="border-t border-gray-50">
                      <td className="px-3 py-2 relative">
                        <div className="flex items-center gap-1">
                          <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <input
                            value={productSearch[idx] ?? ""}
                            onChange={e => searchProducts(idx, e.target.value)}
                            className="input py-1 text-xs"
                            placeholder="Buscar productoâ€¦"
                          />
                        </div>
                        {(productResults[idx]?.length ?? 0) > 0 && (
                          <div className="absolute z-10 left-3 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {productResults[idx].map(p => (
                              <button key={p.id} type="button" onClick={() => selectProduct(idx, p)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs">
                                <span className="font-mono text-brand-700 mr-2">{p.codigo}</span>{p.descripcion}
                              </button>
                            ))}
                          </div>
                        )}
                        {errors.items?.[idx]?.product_id && <p className="text-xs text-red-500">{errors.items[idx]?.product_id?.message}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <select {...register(`items.${idx}.unidad`)} className="input py-1 text-xs">
                          <option value="pza">pza</option>
                          <option value="kg">kg</option>
                          <option value="ton">ton</option>
                          <option value="m">m</option>
                          <option value="rollo">rollo</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" {...register(`items.${idx}.cantidad_solicitada`)} className="input py-1 text-xs text-right" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" {...register(`items.${idx}.precio_unitario`)} className="input py-1 text-xs text-right" />
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 font-medium">{formatCurrency(qty * pu)}</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => remove(idx)} className="p-1 text-gray-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
            <div className="space-y-1 text-sm w-56">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>IVA (16%)</span><span>{formatCurrency(iva)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-1"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/purchases" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? "Guardandoâ€¦" : "Crear Orden de Compra"}
          </button>
        </div>
      </form>
    </div>
  );
}

