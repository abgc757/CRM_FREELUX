"use client";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

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
  uso_cfdi: z.string().default("G03"),
  regimen_fiscal: z.string().optional(),
  credito_activo: z.boolean().default(false),
  limite_credito: z.coerce.number().min(0).default(0),
  dias_credito: z.coerce.number().min(0).default(30),
  notas: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function NewClientPage() {
  const router = useRouter();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: "publico_general", uso_cfdi: "G03", credito_activo: false, limite_credito: 0, dias_credito: 30 },
  });

  const creditoActivo = watch("credito_activo");

  const mutation = useMutation({
    mutationFn: (data: FormValues) => api.post("/clients", data).then(r => r.data),
    onSuccess: (c) => { toast.success(`Cliente ${c.nombre} creado`); router.push(`/dashboard/clients/${c.id}`); },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error al crear cliente"),
  });

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/clients" className="p-1.5 rounded hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold text-gray-900">Nuevo cliente</h1>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
        {/* Datos generales */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Datos generales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Nombre / Razón social *</label>
              <input {...register("nombre")} className="input" />
              {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
            </div>
            <div>
              <label className="label">Nombre fiscal (si difiere)</label>
              <input {...register("razon_social")} className="input" placeholder="Solo si factura con otro nombre" />
            </div>
            <div>
              <label className="label">RFC</label>
              <input {...register("rfc")} className="input" placeholder="AAA000000AAA" />
            </div>
            <div>
              <label className="label">Tipo de cliente *</label>
              <select {...register("tipo")} className="input">
                <option value="publico_general">Público general</option>
                <option value="contratista">Contratista</option>
                <option value="constructora">Constructora</option>
                <option value="mayorista">Mayorista</option>
              </select>
            </div>
            <div>
              <label className="label">Uso CFDI</label>
              <select {...register("uso_cfdi")} className="input">
                <option value="G01">G01 — Adquisición de mercancias</option>
                <option value="G03">G03 — Gastos en general</option>
                <option value="I01">I01 — Construcciones</option>
                <option value="I03">I03 — Equipo de transporte</option>
                <option value="P01">P01 — Por definir</option>
              </select>
            </div>
            <div>
              <label className="label">Régimen fiscal</label>
              <select {...register("regimen_fiscal")} className="input">
                <option value="">— Seleccionar —</option>
                <option value="601">601 — General de Ley Personas Morales</option>
                <option value="612">612 — Personas Físicas con Actividades Empresariales</option>
                <option value="616">616 — Sin obligaciones fiscales</option>
                <option value="626">626 — Régimen Simplificado de Confianza</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Teléfono</label>
              <input {...register("telefono")} className="input" placeholder="614 000 0000" />
            </div>
            <div>
              <label className="label">WhatsApp</label>
              <input {...register("whatsapp")} className="input" placeholder="614 000 0000" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Email</label>
              <input type="email" {...register("email")} className="input" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Dirección</label>
              <textarea {...register("direccion")} rows={2} className="input" />
            </div>
            <div>
              <label className="label">Ciudad</label>
              <input {...register("ciudad")} className="input" />
            </div>
            <div>
              <label className="label">Estado</label>
              <input {...register("estado")} className="input" />
            </div>
            <div>
              <label className="label">C.P.</label>
              <input {...register("cp")} className="input" maxLength={5} />
            </div>
          </div>
        </div>

        {/* Crédito */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Crédito</h2>
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input type="checkbox" {...register("credito_activo")} className="w-4 h-4 accent-brand-600" />
            <span className="text-sm font-medium text-gray-800">Habilitar crédito para este cliente</span>
          </label>
          {creditoActivo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Límite de crédito (MXN)</label>
                <input type="number" step="100" {...register("limite_credito")} className="input" />
              </div>
              <div>
                <label className="label">Días de crédito</label>
                <input type="number" {...register("dias_credito")} className="input" />
              </div>
            </div>
          )}
        </div>

        {/* Notas */}
        <div className="card p-5 space-y-2">
          <label className="label">Notas internas</label>
          <textarea {...register("notas")} rows={3} className="input" placeholder="Observaciones, preferencias, referencias…" />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/clients" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? "Guardando…" : "Crear cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
