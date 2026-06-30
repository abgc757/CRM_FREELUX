"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

interface Vehicle { id: number; placa: string; descripcion: string; }
interface Operator { id: number; nombre: string; telefono: string | null; }
interface Client { id: number; nombre: string; direccion: string | null; ciudad: string | null; }

export default function NewDeliveryPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    sale_id: "", client_id: "", direccion_entrega: "", ciudad: "",
    contacto_entrega: "", telefono_entrega: "",
    fecha_programada: "", vehiculo_id: "", operador_id: "", notas: "",
  });
  const [items, setItems] = useState([{ descripcion: "", cantidad: "1", unidad: "pza" }]);
  const [clientSearch, setClientSearch] = useState("");

  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["vehicles"], queryFn: () => api.get("/logistics/vehicles").then(r => r.data) });
  const { data: operators } = useQuery<Operator[]>({ queryKey: ["operators"], queryFn: () => api.get("/logistics/operators").then(r => r.data) });
  const { data: clientsData } = useQuery<{ items: Client[] }>({
    queryKey: ["clients-search", clientSearch],
    queryFn: () => api.get("/clients", { params: { search: clientSearch, page_size: 8, page: 1 } }).then(r => r.data),
    enabled: clientSearch.length >= 2,
  });

  const create = useMutation({
    mutationFn: (payload: any) => api.post("/logistics/deliveries", payload).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      router.push(`/dashboard/logistics/${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) return;
    create.mutate({
      ...form,
      sale_id: form.sale_id ? parseInt(form.sale_id) : null,
      client_id: parseInt(form.client_id),
      vehiculo_id: form.vehiculo_id ? parseInt(form.vehiculo_id) : null,
      operador_id: form.operador_id ? parseInt(form.operador_id) : null,
      fecha_programada: form.fecha_programada || null,
      items: items.filter(i => i.descripcion.trim()).map(i => ({
        descripcion: i.descripcion,
        cantidad: parseFloat(i.cantidad) || 1,
        unidad: i.unidad || null,
      })),
    });
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/dashboard/logistics" style={{ color: "#999", display: "flex", textDecoration: "none" }}>
          <ArrowLeft style={{ width: 16, height: 16 }} />
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "#111" }}>Nueva entrega</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Cliente */}
        <div className="card" style={{ padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#aaa", marginBottom: 12 }}>Cliente y destino</p>
          <div className="two-col-grid">
            <div>
              <label className="label">Buscar cliente *</label>
              <input type="text" className="input" placeholder="Nombre del cliente…" value={clientSearch}
                onChange={e => setClientSearch(e.target.value)} />
              {clientsData?.items.length && !form.client_id ? (
                <div style={{ border: "1px solid #e4e4e4", borderRadius: 5, marginTop: 4, overflow: "hidden" }}>
                  {clientsData.items.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => {
                        set("client_id", String(c.id));
                        set("direccion_entrega", c.direccion ?? "");
                        set("ciudad", c.ciudad ?? "");
                        setClientSearch(c.nombre);
                      }}
                      style={{ width: "100%", padding: "8px 12px", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #f5f5f5", cursor: "pointer", fontSize: 13 }}>
                      {c.nombre}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <label className="label">Folio de venta vinculada</label>
              <input type="text" className="input" placeholder="VTA-XXXXXX (opcional)" value={form.sale_id}
                onChange={e => set("sale_id", e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="label">Dirección de entrega *</label>
            <input type="text" className="input" required value={form.direccion_entrega}
              onChange={e => set("direccion_entrega", e.target.value)} placeholder="Calle, número, colonia…" />
          </div>
          <div className="two-col-grid" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Ciudad</label>
              <input type="text" className="input" value={form.ciudad} onChange={e => set("ciudad", e.target.value)} />
            </div>
            <div>
              <label className="label">Contacto en destino</label>
              <input type="text" className="input" value={form.contacto_entrega} onChange={e => set("contacto_entrega", e.target.value)} />
            </div>
            <div>
              <label className="label">Teléfono contacto</label>
              <input type="text" className="input" value={form.telefono_entrega} onChange={e => set("telefono_entrega", e.target.value)} />
            </div>
            <div>
              <label className="label">Fecha programada</label>
              <input type="date" className="input" value={form.fecha_programada} onChange={e => set("fecha_programada", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Asignación */}
        <div className="card" style={{ padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#aaa", marginBottom: 12 }}>Asignación de transporte</p>
          <div className="two-col-grid">
            <div>
              <label className="label">Vehículo</label>
              <select className="input" value={form.vehiculo_id} onChange={e => set("vehiculo_id", e.target.value)}>
                <option value="">— Sin asignar —</option>
                {vehicles?.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.descripcion}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Operador</label>
              <select className="input" value={form.operador_id} onChange={e => set("operador_id", e.target.value)}>
                <option value="">— Sin asignar —</option>
                {operators?.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} style={{ height: "auto", padding: "10px 12px" }}
              value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="Instrucciones especiales de entrega…" />
          </div>
        </div>

        {/* Artículos */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#aaa" }}>Artículos a entregar</p>
            <button type="button" className="btn-secondary" style={{ fontSize: 11 }}
              onClick={() => setItems(i => [...i, { descripcion: "", cantidad: "1", unidad: "pza" }])}>
              <Plus style={{ width: 12, height: 12 }} /> Agregar
            </button>
          </div>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 90px 80px 32px", gap: 8, marginBottom: 8 }}>
              <input type="text" className="input" placeholder="Descripción del artículo"
                value={item.descripcion} onChange={e => setItems(arr => arr.map((a, i) => i === idx ? { ...a, descripcion: e.target.value } : a))} />
              <input type="number" className="input" placeholder="Cant." min="0.001" step="any"
                value={item.cantidad} onChange={e => setItems(arr => arr.map((a, i) => i === idx ? { ...a, cantidad: e.target.value } : a))} />
              <input type="text" className="input" placeholder="Unidad"
                value={item.unidad} onChange={e => setItems(arr => arr.map((a, i) => i === idx ? { ...a, unidad: e.target.value } : a))} />
              <button type="button" onClick={() => setItems(a => a.filter((_, i) => i !== idx))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={create.isPending || !form.client_id} className="btn-accent">
            {create.isPending ? "Guardando…" : "Crear pedido de entrega"}
          </button>
          <Link href="/dashboard/logistics" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
