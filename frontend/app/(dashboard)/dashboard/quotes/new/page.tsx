"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Search, Trash2, ArrowLeft, Save, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

/* ── Types ────────────────────────────────────── */
interface Client { id: number; nombre: string; rfc: string | null; tipo: string; }
interface PriceRow { client_type: string; precio: number; }
interface Product {
  id: number; clave: string; descripcion: string;
  precio_compra: number; peso_kg: number; stock_actual: number;
  unidad_venta: string; granel: boolean; tiene_impuesto: boolean;
  prices: PriceRow[];
}
interface LineItem {
  product_id: number; clave: string; descripcion: string;
  cantidad: number; unidad: string;
  precio_unitario: number; precio_compra: number;
  // valores base del producto para conversión al cambiar unidad
  precio_base: number; costo_base: number; unidad_base: string; peso_kg: number;
  descuento_pct: number; tiene_iva: boolean; subtotal: number;
}

const IVA = 0.16;
const UNIDADES = ["pza","kg","ton","metro","rollo"];

function calcSubtotal(item: LineItem): number {
  return +(item.cantidad * item.precio_unitario * (1 - item.descuento_pct / 100)).toFixed(4);
}

/* ── Helpers ──────────────────────────────────── */
function resolvePrice(p: Product, clientTipo: string | undefined): number {
  if (p.prices && p.prices.length > 0) {
    const match = p.prices.find(pr => pr.client_type === clientTipo);
    return Number((match ?? p.prices[0]).precio);
  }
  return Number(p.precio_compra) * 1.3;
}

/**
 * Convierte un precio entre unidades usando peso_kg como factor de conversión.
 * precioBase es el precio por unidadBase (unidad nativa del producto).
 * pza↔kg↔ton se convierten vía peso_kg; metro y rollo se devuelven sin conversión
 * si no hay relación de peso definida.
 */
function convertUnitPrice(precioBase: number, unidadBase: string, pesoKg: number, toUnit: string): number {
  if (unidadBase === toUnit) return precioBase;

  // Normalizar a precio por kg
  let perKg: number;
  switch (unidadBase) {
    case "pza":  perKg = pesoKg > 0 ? precioBase / pesoKg : null!; break;
    case "kg":   perKg = precioBase; break;
    case "ton":  perKg = precioBase / 1000; break;
    default:     return precioBase; // metro/rollo: sin conversión
  }
  if (!perKg) return precioBase; // peso_kg = 0, no se puede convertir

  switch (toUnit) {
    case "pza":  return pesoKg > 0 ? +(perKg * pesoKg).toFixed(4) : precioBase;
    case "kg":   return +perKg.toFixed(4);
    case "ton":  return +(perKg * 1000).toFixed(4);
    default:     return precioBase; // metro/rollo
  }
}

/* ── Component ────────────────────────────────── */
export default function NewQuotePage() {
  const router = useRouter();

  // Client picker
  const [clientSearch, setClientSearch]     = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDrop, setShowClientDrop] = useState(false);

  // Product picker
  const [productSearch, setProductSearch]   = useState("");
  const [showProductDrop, setShowProductDrop] = useState(false);
  const productInputRef = useRef<HTMLInputElement>(null);

  // Quote data
  const [items, setItems]           = useState<LineItem[]>([]);
  const [notas, setNotas]           = useState("");
  const [condiciones, setCondiciones] = useState("Contado");
  const [vigencia, setVigencia]     = useState(15);

  /* Queries */
  const { data: clientsData } = useQuery<{ items: Client[] }>({
    queryKey: ["clients-search", clientSearch],
    queryFn: () => api.get("/clients", { params: { q: clientSearch || undefined, page_size: 10 } }).then(r => r.data),
    enabled: clientSearch.length >= 1,
  });

  const { data: productsData, isFetching: fetchingProducts } = useQuery<{ items: Product[] }>({
    queryKey: ["products-search", productSearch],
    queryFn: () => api.get("/products", { params: { q: productSearch, page_size: 15 } }).then(r => r.data),
    enabled: productSearch.length >= 2,
    staleTime: 10000,
  });

  /* Save mutation */
  const mutation = useMutation({
    mutationFn: (body: object) => api.post("/quotes", body).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Cotización ${data.folio} creada`);
      router.push(`/dashboard/quotes/${data.id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error al crear cotización"),
  });

  /* Add product — triggered by onMouseDown to fire before blur */
  const addProduct = useCallback((p: Product) => {
    const price = resolvePrice(p, selectedClient?.tipo);
    setItems(prev => {
      const existing = prev.findIndex(i => i.product_id === p.id);
      if (existing >= 0) {
        return prev.map((it, idx) => {
          if (idx !== existing) return it;
          const updated = { ...it, cantidad: it.cantidad + 1 };
          return { ...updated, subtotal: calcSubtotal(updated) };
        });
      }
      const item: LineItem = {
        product_id: p.id, clave: p.clave, descripcion: p.descripcion,
        cantidad: 1, unidad: p.unidad_venta,
        precio_unitario: price, precio_compra: Number(p.precio_compra),
        precio_base: price, costo_base: Number(p.precio_compra),
        unidad_base: p.unidad_venta, peso_kg: Number(p.peso_kg),
        descuento_pct: 0, tiene_iva: p.tiene_impuesto,
        subtotal: price,
      };
      return [...prev, item];
    });
    setProductSearch("");
    setShowProductDrop(false);
    productInputRef.current?.focus();
  }, [selectedClient]);

  /* Update a line item field — al cambiar unidad recalcula precio_unitario */
  function updateItem(idx: number, field: keyof LineItem, value: any) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      let updated = { ...it, [field]: value };
      // Recalcular precio al cambiar unidad
      if (field === "unidad") {
        updated.precio_unitario = convertUnitPrice(it.precio_base, it.unidad_base, it.peso_kg, value as string);
        updated.precio_compra   = convertUnitPrice(it.costo_base,  it.unidad_base, it.peso_kg, value as string);
      }
      updated.subtotal = calcSubtotal(updated);
      return updated;
    }));
  }

  /* Totals */
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const ivaTotal = items.filter(i => i.tiene_iva).reduce((s, i) => s + i.subtotal * IVA, 0);
  const total    = subtotal + ivaTotal;

  /* Submit */
  function submit() {
    if (!selectedClient) return toast.error("Selecciona un cliente");
    if (!items.length)   return toast.error("Agrega al menos un producto");
    mutation.mutate({
      client_id: selectedClient.id,
      notas: notas || undefined,
      condiciones_pago: condiciones,
      vigencia_dias: vigencia,
      items: items.map(i => ({
        product_id: i.product_id, descripcion: i.descripcion,
        cantidad: i.cantidad, unidad: i.unidad,
        precio_unitario: i.precio_unitario,
        descuento_pct: i.descuento_pct,
        tiene_iva: i.tiene_iva,
      })),
    });
  }

  const products = productsData?.items ?? [];
  const clients  = clientsData?.items  ?? [];

  /* ── Render ── */
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/dashboard/quotes" style={{ color: "#aaa", display: "flex" }}>
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "#111", letterSpacing: "-.02em" }}>Nueva cotización</h1>
      </div>

      {/* ── Cliente ── */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <p className="label" style={{ marginBottom: 10 }}>Cliente</p>
        {selectedClient ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafa", border: "1px solid #e4e4e4", borderRadius: 4, padding: "10px 14px" }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{selectedClient.nombre}</p>
              {selectedClient.rfc && <p style={{ fontSize: 11, color: "#999", marginTop: 2 }}>RFC: {selectedClient.rfc} · Tipo: {selectedClient.tipo}</p>}
            </div>
            <button onClick={() => setSelectedClient(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", display: "flex" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#e00")}
              onMouseLeave={e => (e.currentTarget.style.color = "#ccc")}>
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#bbb" }} />
            <input
              className="input" style={{ paddingLeft: 32 }}
              placeholder="Buscar cliente por nombre o RFC..."
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true); }}
              onFocus={() => setShowClientDrop(true)}
              onBlur={() => setTimeout(() => setShowClientDrop(false), 150)}
            />
            {showClientDrop && clients.length > 0 && (
              <div style={{ position: "absolute", zIndex: 50, left: 0, right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid #e4e4e4", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,.08)", maxHeight: 220, overflowY: "auto" }}>
                {clients.map(c => (
                  <button key={c.id}
                    onMouseDown={e => { e.preventDefault(); setSelectedClient(c); setShowClientDrop(false); setClientSearch(""); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 12, background: "none", border: "none", borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                    <span style={{ fontWeight: 600, color: "#222" }}>{c.nombre}</span>
                    {c.rfc && <span style={{ marginLeft: 8, color: "#aaa", fontSize: 11 }}>{c.rfc}</span>}
                    <span style={{ marginLeft: 8, fontSize: 10, color: "#e55c00", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{c.tipo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Productos ── */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p className="label" style={{ marginBottom: 0 }}>Productos</p>
          <span style={{ fontSize: 11, color: "#bbb" }}>{items.length} partida{items.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Search box */}
        <div style={{ position: "relative", marginBottom: items.length > 0 ? 16 : 0 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#bbb", pointerEvents: "none" }} />
          <input
            ref={productInputRef}
            className="input" style={{ paddingLeft: 32, paddingRight: fetchingProducts ? 32 : undefined }}
            placeholder="Escribe clave o descripción (mínimo 2 caracteres)..."
            value={productSearch}
            onChange={e => { setProductSearch(e.target.value); setShowProductDrop(true); }}
            onFocus={() => productSearch.length >= 2 && setShowProductDrop(true)}
            onBlur={() => setTimeout(() => setShowProductDrop(false), 200)}
          />
          {/* Dropdown */}
          {showProductDrop && productSearch.length >= 2 && (
            <div style={{ position: "absolute", zIndex: 50, left: 0, right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid #e4e4e4", borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,.10)", maxHeight: 280, overflowY: "auto" }}>
              {fetchingProducts && products.length === 0 && (
                <p style={{ padding: "12px 14px", fontSize: 11, color: "#bbb" }}>Buscando...</p>
              )}
              {!fetchingProducts && products.length === 0 && (
                <p style={{ padding: "12px 14px", fontSize: 11, color: "#bbb" }}>Sin resultados para "{productSearch}"</p>
              )}
              {products.map(p => {
                const price = resolvePrice(p, selectedClient?.tipo);
                return (
                  <button key={p.id}
                    onMouseDown={e => { e.preventDefault(); addProduct(p); }}
                    style={{ display: "flex", alignItems: "center", width: "100%", textAlign: "left", padding: "9px 14px", background: "none", border: "none", borderBottom: "1px solid #f5f5f5", cursor: "pointer", gap: 10 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                    {/* Clave */}
                    <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "#e55c00", flexShrink: 0, minWidth: 72 }}>{p.clave}</span>
                    {/* Descripción */}
                    <span style={{ flex: 1, fontSize: 12, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descripcion}</span>
                    {/* Stock + unidad */}
                    <span style={{ fontSize: 10, color: "#aaa", flexShrink: 0 }}>{Number(p.stock_actual)} {p.unidad_venta}</span>
                    {/* Precio */}
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#111", flexShrink: 0, minWidth: 72, textAlign: "right" }}>
                      {formatCurrency(price)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Items table ── */}
        {items.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Producto</th>
                  <th style={{ width: 90, textAlign: "right" }}>Cantidad</th>
                  <th style={{ width: 90 }}>Unidad</th>
                  <th style={{ width: 110, textAlign: "right" }}>Costo unit.</th>
                  <th style={{ width: 120, textAlign: "right" }}>P. Venta unit.</th>
                  <th style={{ width: 70, textAlign: "right" }}>Desc. %</th>
                  <th style={{ width: 80, textAlign: "center" }}>IVA</th>
                  <th style={{ width: 110, textAlign: "right" }}>Subtotal</th>
                  <th style={{ width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const margin = item.precio_unitario > 0 && item.precio_compra > 0
                    ? Math.round(((item.precio_unitario - item.precio_compra) / item.precio_unitario) * 100)
                    : null;
                  return (
                    <tr key={idx}>
                      {/* Descripción */}
                      <td>
                        <p className="folio" style={{ fontSize: 10 }}>{item.clave}</p>
                        <p style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{item.descripcion}</p>
                      </td>
                      {/* Cantidad */}
                      <td>
                        <input
                          type="number" min="0.001" step="any"
                          className="input"
                          style={{ textAlign: "right", fontSize: 12, padding: "4px 8px", width: 80 }}
                          value={item.cantidad}
                          onChange={e => updateItem(idx, "cantidad", parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      {/* Unidad */}
                      <td>
                        <div style={{ position: "relative", width: 80 }}>
                          <select
                            className="input"
                            style={{ fontSize: 12, padding: "4px 24px 4px 8px", appearance: "none", width: "100%" }}
                            value={item.unidad}
                            onChange={e => updateItem(idx, "unidad", e.target.value)}>
                            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <ChevronDown style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, color: "#aaa", pointerEvents: "none" }} />
                        </div>
                      </td>
                      {/* Costo unitario (solo lectura, referencia) */}
                      <td style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 12, color: "#aaa" }}>{formatCurrency(item.precio_compra)}</p>
                        {margin !== null && (
                          <p style={{ fontSize: 9, color: margin >= 20 ? "#16a34a" : margin >= 10 ? "#e55c00" : "#dc2626", fontWeight: 700, marginTop: 1 }}>
                            Margen {margin}%
                          </p>
                        )}
                      </td>
                      {/* Precio venta (solo lectura) */}
                      <td style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{formatCurrency(item.precio_unitario)}</p>
                      </td>
                      {/* Descuento */}
                      <td>
                        <input
                          type="number" min="0" max="100" step="0.1"
                          className="input"
                          style={{ textAlign: "right", fontSize: 12, padding: "4px 8px", width: 64 }}
                          value={item.descuento_pct}
                          onChange={e => updateItem(idx, "descuento_pct", parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      {/* IVA toggle */}
                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => updateItem(idx, "tiene_iva", !item.tiene_iva)}
                          style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
                            padding: "3px 7px", borderRadius: 2, border: "1px solid",
                            background: item.tiene_iva ? "#111" : "transparent",
                            color: item.tiene_iva ? "#fff" : "#bbb",
                            borderColor: item.tiene_iva ? "#111" : "#e4e4e4",
                            cursor: "pointer",
                          }}>
                          {item.tiene_iva ? "16%" : "0%"}
                        </button>
                      </td>
                      {/* Subtotal */}
                      <td style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{formatCurrency(item.subtotal)}</p>
                        {item.descuento_pct > 0 && (
                          <p style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>
                            -{item.descuento_pct}% desc.
                          </p>
                        )}
                      </td>
                      {/* Delete */}
                      <td>
                        <button
                          onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", display: "flex" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#dc2626")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#ddd")}>
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {items.length === 0 && (
          <div style={{ textAlign: "center", padding: "28px 0", borderTop: "1px solid #f5f5f5" }}>
            <p style={{ fontSize: 12, color: "#ccc" }}>Busca y agrega productos usando el campo de arriba</p>
          </div>
        )}
      </div>

      {/* ── Condiciones + Resumen ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Condiciones */}
        <div className="card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <p className="label" style={{ marginBottom: 0 }}>Condiciones</p>
          <div>
            <label className="label">Condiciones de pago</label>
            <input className="input" value={condiciones} onChange={e => setCondiciones(e.target.value)} />
          </div>
          <div>
            <label className="label">Vigencia (días)</label>
            <input type="number" className="input" value={vigencia} min={1}
              onChange={e => setVigencia(parseInt(e.target.value) || 15)} />
          </div>
          <div>
            <label className="label">Notas internas</label>
            <textarea className="input" rows={3} value={notas} onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones, condiciones especiales..." />
          </div>
        </div>

        {/* Resumen */}
        <div className="card" style={{ padding: "16px 20px" }}>
          <p className="label" style={{ marginBottom: 14 }}>Resumen</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666" }}>
              <span>{items.length} partida{items.length !== 1 ? "s" : ""}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666" }}>
              <span>IVA (16%)</span>
              <span>{formatCurrency(ivaTotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 900, color: "#111", paddingTop: 10, borderTop: "1px solid #f0f0f0", letterSpacing: "-.02em" }}>
              <span>Total</span>
              <span style={{ color: "#e55c00" }}>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Margen global estimado */}
          {items.length > 0 && (() => {
            const costoTotal = items.reduce((s, i) => s + i.cantidad * i.precio_compra, 0);
            const margenGlobal = subtotal > 0 ? Math.round(((subtotal - costoTotal) / subtotal) * 100) : 0;
            return (
              <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 4, padding: "8px 12px", marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: "#aaa", marginBottom: 2 }}>Margen estimado</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: margenGlobal >= 20 ? "#16a34a" : margenGlobal >= 10 ? "#e55c00" : "#dc2626" }}>
                  {margenGlobal}%
                </p>
              </div>
            );
          })()}

          <button
            onClick={submit}
            disabled={mutation.isPending || !selectedClient || !items.length}
            className="btn-primary"
            style={{ width: "100%", padding: "10px 0", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Save style={{ width: 13, height: 13 }} />
            {mutation.isPending ? "Guardando..." : "Guardar cotización"}
          </button>

          {!selectedClient && (
            <p style={{ fontSize: 10, color: "#bbb", textAlign: "center", marginTop: 8 }}>Selecciona un cliente primero</p>
          )}
        </div>
      </div>
    </div>
  );
}
