"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { Plus, X, Pencil, Building2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Supplier { id: number; nombre: string; rfc: string | null; contacto: string | null; telefono: string | null; email: string | null; direccion: string | null; dias_credito: number; is_active: boolean; }

const schema = z.object({
  nombre: z.string().min(1, "Requerido"),
  rfc: z.string().optional(),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email invÃ¡lido").optional().or(z.literal("")),
  direccion: z.string().optional(),
  dias_credito: z.coerce.number().min(0).default(0),
});
type FormValues = z.infer<typeof schema>;

function SupplierModal({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: supplier ? { nombre: supplier.nombre, rfc: supplier.rfc ?? "", contacto: supplier.contacto ?? "", telefono: supplier.telefono ?? "", email: supplier.email ?? "", direccion: supplier.direccion ?? "", dias_credito: supplier.dias_credito } : { dias_credito: 0 },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => supplier
      ? api.patch(`/suppliers/${supplier.id}`, data).then(r => r.data)
      : api.post("/suppliers", data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success(supplier ? "Proveedor actualizado" : "Proveedor creado"); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{supplier ? "Editar proveedor" : "Nuevo proveedor"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <div className="px-6 py-4 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nombre / RazÃ³n social *</label>
              <input {...register("nombre")} className="input" />
              {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
            </div>
            <div>
              <label className="label">RFC</label>
              <input {...register("rfc")} className="input" placeholder="AAA000000AAA" />
            </div>
            <div>
              <label className="label">DÃ­as de crÃ©dito</label>
              <input type="number" {...register("dias_credito")} className="input" />
            </div>
            <div>
              <label className="label">Contacto</label>
              <input {...register("contacto")} className="input" placeholder="Nombre del contacto" />
            </div>
            <div>
              <label className="label">TelÃ©fono</label>
              <input {...register("telefono")} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Email</label>
              <input type="email" {...register("email")} className="input" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">DirecciÃ³n</label>
              <textarea {...register("direccion")} rows={2} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary text-sm">
              {mutation.isPending ? "Guardandoâ€¦" : supplier ? "Guardar cambios" : "Crear proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ open: boolean; supplier?: Supplier }>({ open: false });

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers", q],
    queryFn: () => api.get("/suppliers", { params: { q: q || undefined } }).then(r => r.data),
  });

  return (
    <div className="space-y-5">
      {modal.open && <SupplierModal supplier={modal.supplier} onClose={() => setModal({ open: false })} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/purchases" className="text-sm text-brand-600 hover:underline">â† Compras</Link>
          <h1 className="text-xl font-bold text-gray-900">Proveedores</h1>
          <span className="text-sm text-gray-500">({suppliers.length})</span>
        </div>
        <button onClick={() => setModal({ open: true })} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nuevo proveedor
        </button>
      </div>

      <input value={q} onChange={e => setQ(e.target.value)} className="input max-w-sm" placeholder="Buscar por nombre, RFC o contactoâ€¦" />

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">RFC</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">TelÃ©fono</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">DÃ­as crÃ©dito</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>Sin proveedores registrados</p>
                </td></tr>
              ) : suppliers.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.nombre}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">{s.rfc ?? "â€”"}</td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{s.contacto ?? "â€”"}</td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{s.telefono ?? "â€”"}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{s.dias_credito}d</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setModal({ open: true, supplier: s })} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

