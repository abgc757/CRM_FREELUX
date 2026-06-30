"use client";
import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Search, Trash2, Plus, Minus, CreditCard, Banknote, Wifi, X, Lock, Unlock } from "lucide-react";
import Link from "next/link";

interface Product {
  id: number; clave: string; descripcion: string;
  precio_compra: number; unidad_venta: string; stock_actual: number;
  prices?: Array<{ client_type: string; precio: number }>;
}
interface CartItem {
  product_id: number; descripcion: string; cantidad: number;
  precio_unitario: number; descuento_pct: number; tiene_iva: boolean; unidad: string;
}
interface Session { id: number; folio: string; status: string; fondo_inicial: number; total_ventas: number; num_transacciones: number; opened_at: string; }

const IVA = 0.16;

export default function POSPage() {
  const qc = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [efectivoPagado, setEfectivoPagado] = useState("");
  const [openingFund, setOpeningFund] = useState("0");
  const [ticket, setTicket] = useState<any>(null);

  // Sesión actual
  const { data: session, isLoading: loadingSession } = useQuery<Session | null>({
    queryKey: ["pos-session"],
    queryFn: () => api.get("/pos/sessions/current").then(r => r.data),
  });

  // Productos (búsqueda)
  const { data: productsData } = useQuery<{ items: Product[] }>({
    queryKey: ["pos-products", search],
    queryFn: () => api.get("/products", { params: { search, page_size: 12, page: 1 } }).then(r => r.data),
    enabled: search.length >= 2,
  });

  const openSession = useMutation({
    mutationFn: () => api.post("/pos/sessions/open", { fondo_inicial: parseFloat(openingFund) || 0 }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos-session"] }),
  });

  const closeSession = useMutation({
    mutationFn: (efectivo_contado: number) =>
      api.post("/pos/sessions/close", { efectivo_contado }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos-session"] }),
  });

  const processSale = useMutation({
    mutationFn: (payload: any) => api.post("/pos/sales", payload).then(r => r.data),
    onSuccess: (data) => {
      setTicket(data);
      setCart([]);
      setSearch("");
      setEfectivoPagado("");
      qc.invalidateQueries({ queryKey: ["pos-session"] });
    },
  });

  // Totales
  const subtotal = cart.reduce((acc, i) => {
    const base = i.cantidad * i.precio_unitario * (1 - i.descuento_pct / 100);
    return acc + base;
  }, 0);
  const iva = cart.reduce((acc, i) => {
    const base = i.cantidad * i.precio_unitario * (1 - i.descuento_pct / 100);
    return acc + (i.tiene_iva ? base * IVA : 0);
  }, 0);
  const total = subtotal + iva;
  const pagado = payMethod === "efectivo" ? parseFloat(efectivoPagado) || 0 : total;
  const cambio = Math.max(0, pagado - total);

  const addToCart = (product: Product) => {
    const precio = product.prices?.find(p => p.client_type === "publico_general")?.precio
      ?? product.precio_compra * 1.3;
    setCart(prev => {
      const idx = prev.findIndex(i => i.product_id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], cantidad: updated[idx].cantidad + 1 };
        return updated;
      }
      return [...prev, {
        product_id: product.id,
        descripcion: product.descripcion,
        cantidad: 1,
        precio_unitario: precio,
        descuento_pct: 0,
        tiene_iva: true,
        unidad: product.unidad_venta,
      }];
    });
    setSearch("");
    searchRef.current?.focus();
  };

  const removeItem = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));
  const changeQty = (idx: number, delta: number) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newQty = item.cantidad + delta;
      return newQty <= 0 ? item : { ...item, cantidad: newQty };
    }));
  };

  const handleSell = () => {
    if (!session || !cart.length) return;
    const isMixed = payMethod === "efectivo" && parseFloat(efectivoPagado) < total;
    processSale.mutate({
      metodo_pago: payMethod,
      monto_efectivo: payMethod === "efectivo" ? pagado : 0,
      monto_tarjeta: payMethod === "tarjeta" ? total : 0,
      monto_transferencia: payMethod === "transferencia" ? total : 0,
      items: cart.map(i => ({
        product_id: i.product_id,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        descuento_pct: i.descuento_pct,
        tiene_iva: i.tiene_iva,
      })),
    });
  };

  // ── Sin sesión ──────────────────────────────────────────────────────────────
  if (loadingSession) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#aaa", fontSize: 13 }}>
      Cargando…
    </div>
  );

  if (!session) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Lock style={{ width: 24, height: 24, color: "#aaa" }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>Caja cerrada</p>
        <p style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>Ingresa el fondo inicial para abrir la sesión</p>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#666" }}>Fondo inicial</span>
        <input
          type="number"
          value={openingFund}
          onChange={e => setOpeningFund(e.target.value)}
          className="input"
          style={{ width: 140 }}
          min="0"
          step="100"
        />
      </div>
      <button
        onClick={() => openSession.mutate()}
        disabled={openSession.isPending}
        className="btn-accent"
        style={{ minWidth: 160 }}
      >
        <Unlock style={{ width: 14, height: 14 }} />
        Abrir caja
      </button>
      <Link href="/dashboard/pos/sessions" style={{ fontSize: 12, color: "#aaa", textDecoration: "none" }}>
        Ver historial de sesiones →
      </Link>
    </div>
  );

  // ── Ticket modal ────────────────────────────────────────────────────────────
  if (ticket) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ShoppingCart style={{ width: 24, height: 24, color: "#16a34a" }} />
      </div>
      <p style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>Venta registrada</p>
      <div className="card" style={{ width: "100%", maxWidth: 360, padding: 20 }}>
        <p style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginBottom: 12 }}>TICKET</p>
        <p style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#e55c00" }}>{ticket.folio}</p>
        <div style={{ margin: "12px 0", borderTop: "1px dashed #eee", borderBottom: "1px dashed #eee", padding: "10px 0" }}>
          {ticket.items?.map((i: any) => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "#333", flex: 1, marginRight: 8 }}>{i.descripcion} ×{Number(i.cantidad)}</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(Number(i.subtotal))}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "#aaa" }}>Subtotal</span><span>{formatCurrency(Number(ticket.subtotal))}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "#aaa" }}>IVA 16%</span><span>{formatCurrency(Number(ticket.iva))}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, marginTop: 6 }}>
            <span>Total</span><span style={{ color: "#e55c00" }}>{formatCurrency(Number(ticket.total))}</span>
          </div>
          {Number(ticket.cambio) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#16a34a", fontWeight: 700, marginTop: 4 }}>
              <span>Cambio</span><span>{formatCurrency(Number(ticket.cambio))}</span>
            </div>
          )}
        </div>
      </div>
      <button onClick={() => setTicket(null)} className="btn-primary" style={{ minWidth: 160 }}>
        Nueva venta
      </button>
    </div>
  );

  // ── Terminal POS ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Barra de sesión */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", marginBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>Sesión</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#e55c00" }}>{session.folio}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>Ventas</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>{formatCurrency(session.total_ventas)} ({session.num_transacciones})</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/dashboard/pos/sessions" className="btn-secondary" style={{ fontSize: 11 }}>
            Historial
          </Link>
          <button
            onClick={() => {
              const contado = parseFloat(prompt("Efectivo contado en caja:") || "0") || 0;
              closeSession.mutate(contado);
            }}
            disabled={closeSession.isPending}
            className="btn-secondary"
            style={{ fontSize: 11, color: "#c00" }}
          >
            <Lock style={{ width: 12, height: 12 }} /> Cerrar caja
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>

        {/* Panel izquierdo — búsqueda + resultados */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="search-wrap">
            <Search className="search-icon" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar producto por clave o descripción…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#999", display: "flex" }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          {/* Resultados de búsqueda */}
          {search.length >= 2 && (
            <div className="card" style={{ overflow: "hidden" }}>
              {!productsData?.items.length ? (
                <div className="empty-state" style={{ paddingTop: 24, paddingBottom: 24 }}>
                  <p>Sin resultados</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 0 }}>
                  {productsData.items.map(p => {
                    const precio = p.prices?.find(pr => pr.client_type === "publico_general")?.precio ?? 0;
                    return (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        style={{ padding: "12px 14px", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", cursor: "pointer", textAlign: "left", transition: "background .1s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <p style={{ fontSize: 10, color: "#e55c00", fontWeight: 700, letterSpacing: ".05em", marginBottom: 2 }}>{p.clave}</p>
                        <p style={{ fontSize: 12, color: "#222", fontWeight: 500, lineHeight: 1.3 }}>{p.descripcion}</p>
                        <p style={{ fontSize: 11, color: "#333", fontWeight: 800, marginTop: 4 }}>{formatCurrency(precio)}</p>
                        <p style={{ fontSize: 10, color: stock(p.stock_actual) }}>{Number(p.stock_actual)} {p.unidad_venta}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Carrito */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="panel-header">
              <span className="panel-header-title">
                <ShoppingCart style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
                Carrito ({cart.length})
              </span>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} style={{ fontSize: 11, color: "#c00", background: "none", border: "none", cursor: "pointer" }}>
                  Vaciar
                </button>
              )}
            </div>

            {!cart.length ? (
              <div className="empty-state" style={{ paddingTop: 32, paddingBottom: 32 }}>
                <ShoppingCart style={{ width: 28, height: 28, opacity: .2 }} />
                <p>Busca un producto para agregar</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                    {["Producto", "Cant.", "Precio", "Total", ""].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#aaa" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f8f8f8" }}>
                      <td style={{ padding: "10px 12px", color: "#333", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.descripcion}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button onClick={() => changeQty(idx, -1)} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #e4e4e4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Minus style={{ width: 10, height: 10 }} />
                          </button>
                          <span style={{ fontWeight: 700, minWidth: 24, textAlign: "center" }}>{item.cantidad}</span>
                          <button onClick={() => changeQty(idx, 1)} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #e4e4e4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Plus style={{ width: 10, height: 10 }} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#555" }}>{formatCurrency(item.precio_unitario)}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#111" }}>
                        {formatCurrency(item.cantidad * item.precio_unitario * (1 - item.descuento_pct / 100))}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", display: "flex" }}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel derecho — pago */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#aaa", marginBottom: 12 }}>
              Resumen
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#666" }}>Subtotal</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#666" }}>IVA 16%</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(iva)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 900, marginTop: 8, paddingTop: 8, borderTop: "2px solid #111" }}>
                <span>Total</span>
                <span style={{ color: "#e55c00" }}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#aaa", marginBottom: 10 }}>
              Método de pago
            </p>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {([
                ["efectivo", Banknote, "Efectivo"],
                ["tarjeta", CreditCard, "Tarjeta"],
                ["transferencia", Wifi, "Transfer."],
              ] as const).map(([method, Icon, label]) => (
                <button
                  key={method}
                  onClick={() => setPayMethod(method)}
                  style={{
                    flex: 1, padding: "8px 4px", borderRadius: 5, border: "1px solid",
                    borderColor: payMethod === method ? "#e55c00" : "#e4e4e4",
                    background: payMethod === method ? "#fff7ed" : "#fff",
                    color: payMethod === method ? "#e55c00" : "#666",
                    cursor: "pointer", fontSize: 11, fontWeight: 600,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    transition: "all .15s",
                  }}
                >
                  <Icon style={{ width: 16, height: 16 }} />
                  {label}
                </button>
              ))}
            </div>

            {payMethod === "efectivo" && (
              <div style={{ marginBottom: 10 }}>
                <label className="label">Efectivo recibido</label>
                <input
                  type="number"
                  value={efectivoPagado}
                  onChange={e => setEfectivoPagado(e.target.value)}
                  placeholder={formatCurrency(total)}
                  className="input"
                  min="0"
                  step="50"
                />
                {cambio > 0 && (
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", marginTop: 6 }}>
                    Cambio: {formatCurrency(cambio)}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleSell}
              disabled={!cart.length || processSale.isPending || (payMethod === "efectivo" && pagado < total && parseFloat(efectivoPagado) > 0)}
              className="btn-accent"
              style={{ width: "100%", fontSize: 13, fontWeight: 700 }}
            >
              {processSale.isPending ? "Procesando…" : `Cobrar ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function stock(qty: number): string {
  if (qty <= 0) return "#c00";
  if (qty <= 5) return "#d97706";
  return "#aaa";
}
