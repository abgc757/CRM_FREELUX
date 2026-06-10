"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Pencil, X, CreditCard, FileText, ShoppingCart } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Client {
  id: number; nombre: string; razon_social: string | null; rfc: string | null;
  tipo: string; email: string | null; telefono: string | null; whatsapp: string | null;
  direccion: string | null; ciudad: string | null; estado: string | null; cp: string | null;
  uso_cfdi: string | null; regimen_fiscal: string | null;
  credito_activo: boolean; limite_credito: number; dias_credito: number; saldo_pendiente: number;
  seller_id: number | null; notas: string | null; is_active: boolean;
  created_at: string; updated_at: string;
}

const TIPO_LABELS: Record<string, string> = {
  publico_general: "Público general", contratista: "Contratista",
  constructora: "Constructora", mayorista: "Mayorista",
};

const schema = z.object({
  nombre: z.string().min(1, "Requerido"),
  razon_social: z.string().optional(),
  rfc: z.string().optional(),
  tipo: z.enum(["publico_general", "contratista", "constructora", "mayorista"]),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  estado: z.string().optional(),
  cp: z.string().optional(),
  uso_cfdi: z.string().optional(),
  regimen_fiscal: z.string().optional(),
  credito_activo: z.boolean().optional(),
  limite_credito: z.coerce.number().min(0).optional(),
  dias_credito: z.coerce.number().min(0).optional(),
  notas: z.string().optional(),
  is_active: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ["client", id],
    queryFn: () => api.get(`/clients/${id}`).then(r => r.data),
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const creditoActivo = watch("credito_activo", client?.credito_activo);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => api.patch(`/clients/${id}`, data).then(r => r.data),
    onSuccess: (updated) => {
      qc.setQueryData(["client", id], updated);
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente actualizado");
      setEditing(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const startEdit = () => {
    if (!client) return;
    reset({
      nombre: client.nombre, razon_social: client.razon_social ?? "",
      rfc: client.rfc ?? "", tipo: client.tipo as any,
      email: client.email ?? "", telefono: client.telefono ?? "",
      whatsapp: client.whatsapp ?? "", direccion: client.direccion ?? "",
      ciudad: client.ciudad ?? "", estado: client.estado ?? "", cp: client.cp ?? "",
      uso_cfdi: client.uso_cfdi ?? "G03", regimen_fiscal: client.regimen_fiscal ?? "",
      credito_activo: client.credito_activo, limite_credito: client.limite_credito,
      dias_credito: client.dias_credito, notas: client.notas ?? "",
      is_active: client.is_active,
    });
    setEditing(true);
  };

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;
  if (!client) return <div className="text-center py-20 text-gray-400">Cliente no encontrado</div>;

  const disponible = Math.max(0, client.limite_credito - client.saldo_pendiente);
  const utilizacion = client.limite_credito > 0 ? (client.saldo_pendiente / client.limite_credito) * 100 : 0;

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients" className="p-1.5 rounded hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{client.nombre}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">{TIPO_LABELS[client.tipo]}</span>
              {client.rfc && <span className="text-xs font-mono text-gray-400">{client.rfc}</span>}
              {!client.is_active && <span className="badge bg-red-100 text-red-700">Inactivo</span>}
            </div>
          </div>
        </div>
        {!editing && (
          <button onClick={startEdit} className="btn-secondary text-sm flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Editar
          </button>
        )}
      </div>

      {/* Credit bar */}
      {client.credito_activo && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-brand-600" /> Línea de crédito
            </span>
            <span className="text-xs text-gray-500">{client.dias_credito} días</span>
          </div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-gray-500">Usado: <strong className={client.saldo_pendiente > 0 ? "text-red-600" : "text-gray-800"}>{formatCurrency(client.saldo_pendiente)}</strong></span>
            <span className="text-gray-500">Disponible: <strong className="text-green-700">{formatCurrency(disponible)}</strong></span>
            <span className="text-gray-500">Límite: <strong>{formatCurrency(client.limite_credito)}</strong></span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-2 rounded-full transition-all ${utilizacion > 90 ? "bg-red-500" : utilizacion > 60 ? "bg-amber-400" : "bg-green-500"}`}
              style={{ width: `${Math.min(utilizacion, 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{utilizacion.toFixed(1)}% utilizado</p>
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Editando cliente</h2>
              <button type="button" onClick={() => setEditing(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Nombre *</label>
                <input {...register("nombre")} className="input" />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
              </div>
              <div><label className="label">Razón social</label><input {...register("razon_social")} className="input" /></div>
              <div><label className="label">RFC</label><input {...register("rfc")} className="input" /></div>
              <div>
                <label className="label">Tipo</label>
                <select {...register("tipo")} className="input">
                  <option value="publico_general">Público general</option>
                  <option value="contratista">Contratista</option>
                  <option value="constructora">Constructora</option>
                  <option value="mayorista">Mayorista</option>
                </select>
              </div>
              <div><label className="label">Email</label><input type="email" {...register("email")} className="input" /></div>
              <div><label className="label">Teléfono</label><input {...register("telefono")} className="input" /></div>
              <div><label className="label">WhatsApp</label><input {...register("whatsapp")} className="input" /></div>
              <div className="md:col-span-2"><label className="label">Dirección</label><textarea {...register("direccion")} rows={2} className="input" /></div>
              <div><label className="label">Ciudad</label><input {...register("ciudad")} className="input" /></div>
              <div><label className="label">Estado</label><input {...register("estado")} className="input" /></div>
              <div><label className="label">C.P.</label><input {...register("cp")} className="input" maxLength={5} /></div>
              <div>
                <label className="label">Uso CFDI</label>
                <select {...register("uso_cfdi")} className="input">
                  <option value="G01">G01 — Adquisición de mercancias</option>
                  <option value="G03">G03 — Gastos en general</option>
                  <option value="I01">I01 — Construcciones</option>
                  <option value="P01">P01 — Por definir</option>
                </select>
              </div>
              <div>
                <label className="label">Régimen fiscal</label>
                <select {...register("regimen_fiscal")} className="input">
                  <option value="">— Seleccionar —</option>
                  <option value="601">601 — General Personas Morales</option>
                  <option value="612">612 — Personas Físicas Empresariales</option>
                  <option value="616">616 — Sin obligaciones fiscales</option>
                  <option value="626">626 — RESICO</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer w-fit mb-2">
                  <input type="checkbox" {...register("credito_activo")} className="w-4 h-4 accent-brand-600" />
                  <span className="text-sm font-medium">Crédito activo</span>
                </label>
                {creditoActivo && (
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label">Límite (MXN)</label><input type="number" step="100" {...register("limite_credito")} className="input" /></div>
                    <div><label className="label">Días</label><input type="number" {...register("dias_credito")} className="input" /></div>
                  </div>
                )}
              </div>
              <div className="md:col-span-2"><label className="label">Notas</label><textarea {...register("notas")} rows={2} className="input" /></div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input type="checkbox" {...register("is_active")} className="w-4 h-4 accent-brand-600" />
                  <span className="text-sm font-medium">Cliente activo</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacto</h3>
            <InfoRow label="Email" value={client.email} />
            <InfoRow label="Teléfono" value={client.telefono} />
            <InfoRow label="WhatsApp" value={client.whatsapp} />
            <InfoRow label="Dirección" value={[client.direccion, client.ciudad, client.estado, client.cp].filter(Boolean).join(", ")} />
          </div>
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fiscal</h3>
            <InfoRow label="Razón social" value={client.razon_social} />
            <InfoRow label="RFC" value={client.rfc} mono />
            <InfoRow label="Uso CFDI" value={client.uso_cfdi} />
            <InfoRow label="Régimen" value={client.regimen_fiscal} />
          </div>
          {client.notas && (
            <div className="md:col-span-2 card p-4 bg-amber-50 border-amber-200">
              <p className="text-xs font-medium text-amber-700 mb-1">Notas</p>
              <p className="text-sm text-amber-900">{client.notas}</p>
            </div>
          )}
          <div className="md:col-span-2 flex gap-3 text-sm text-gray-400 pt-1">
            <span>Creado {formatDate(client.created_at)}</span>
            <span>·</span>
            <span>Actualizado {formatDate(client.updated_at)}</span>
          </div>
        </div>
      )}

      {/* Quick links */}
      {!editing && (
        <div className="flex gap-3 flex-wrap">
          <Link href={`/dashboard/quotes/new?client_id=${client.id}`} className="btn-secondary text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Nueva cotización
          </Link>
          <Link href={`/dashboard/quotes?client_id=${client.id}`} className="btn-secondary text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Ver cotizaciones
          </Link>
          <Link href={`/dashboard/sales?client_id=${client.id}`} className="btn-secondary text-sm flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Ver ventas
          </Link>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-xs text-gray-500 w-24 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-800 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
