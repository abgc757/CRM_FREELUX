# Mockups UI — CRM FreeLux

Mockups ASCII de las pantallas principales del sistema.

---

## 1. Página de Login

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│              ┌────────────────────────────────┐                │
│              │    🔩 ACEROS Y PERFILES         │                │
│              │       CRM FreeLux              │                │
│              └────────────────────────────────┘                │
│                                                                 │
│              ┌────────────────────────────────┐                │
│              │  Correo electrónico            │                │
│              │  ┌──────────────────────────┐  │                │
│              │  │  admin@freelux.mx        │  │                │
│              │  └──────────────────────────┘  │                │
│              │                                │                │
│              │  Contraseña                    │                │
│              │  ┌──────────────────────────┐  │                │
│              │  │  ••••••••••••            │  │                │
│              │  └──────────────────────────┘  │                │
│              │                                │                │
│              │  ☑ Recordarme   Olvidé mi pass │                │
│              │                                │                │
│              │  ┌──────────────────────────┐  │                │
│              │  │      INICIAR SESIÓN      │  │                │
│              │  └──────────────────────────┘  │                │
│              │                                │                │
│              └────────────────────────────────┘                │
│                                                                 │
│              v1.0.0 · © 2024 FreeLux                           │
└─────────────────────────────────────────────────────────────────┘
```

**Comportamiento**:
- Enter en contraseña envía el formulario
- Error: "Credenciales inválidas" en rojo bajo el botón
- Redirige a `/dashboard` según rol: Vendedor → `/quotes`, Gerente → `/dashboard`, Almacén → `/inventory`

---

## 2. Dashboard (Vista Vendedor)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🔩 FreeLux CRM   │ Buscar...                 🔔 3   👤 Juan García  ▼     │
├───────────────┬──────────────────────────────────────────────────────────┤
│               │                                                            │
│ MENÚ          │  Buenos días, Juan 👋  Miércoles 13 Nov 2024              │
│               │                                                            │
│ 📊 Dashboard  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│               │  │ MIS VENTAS   │ │  COTIZACIONES│ │  CLIENTES    │      │
│ 📋 Cotizar    │  │   MES        │ │  ABIERTAS    │ │  ACTIVOS     │      │
│               │  │  $284,500    │ │     12       │ │     47       │      │
│ 💰 Ventas     │  │  ▲ 18% vs   │ │  3 por vencer│ │              │      │
│               │  │  mes ant.    │ │              │ │              │      │
│ 👥 Clientes   │  └──────────────┘ └──────────────┘ └──────────────┘      │
│               │                                                            │
│ 📦 Productos  │  META MENSUAL  ████████████████████░░░░░░  $284,500/$350k │
│               │                                                            │
│ 🏭 Proveedores│  ┌──────────────────────────┐ ┌───────────────────────┐  │
│               │  │ COTIZACIONES RECIENTES   │ │  ALERTAS              │  │
│ 📥 Inventario │  ├──────────────────────────┤ ├───────────────────────┤  │
│               │  │ COT-2024-0142            │ │ ⚠️ PTR 4x4 — bajo     │  │
│ 🛒 Compras    │  │ Const. Ramírez · $45,200 │ │    stock (8 piezas)   │  │
│               │  │ Enviada · Vence en 3 días│ │                       │  │
│ 📊 Reportes   │  ├──────────────────────────┤ │ ⚠️ IPR-6 — agotado   │  │
│               │  │ COT-2024-0141            │ │                       │  │
│ ⚙️ Config     │  │ Ferreter. El Clavo ·$8,900│ │ 📬 2 cotizaciones    │  │
│               │  │ Borrador                 │ │    sin seguimiento    │  │
│               │  ├──────────────────────────┤ │    (>5 días)          │  │
│               │  │ COT-2024-0139            │ │                       │  │
│               │  │ IIMSA · $120,000         │ │ ┌─────────────────┐  │  │
│               │  │ ✅ Aceptada → Convertir  │ │ │  Ver todas (5) │  │  │
│               │  └──────────────────────────┘ │ └─────────────────┘  │  │
│               │                               └───────────────────────┘  │
│               │  TOP 5 CLIENTES (MES)                                     │
│               │  1. IIMSA Infraestructura         $120,000 ████████      │
│               │  2. Constructora Ramírez           $45,200 █████         │
│               │  3. Metalúrgica del Bajío          $38,900 ████          │
│               │  4. Estructuras Modernas SA         $31,400 ████         │
│               │  5. Ferretería El Clavo             $8,900 █             │
└───────────────┴──────────────────────────────────────────────────────────┘
```

---

## 3. Nueva Cotización (Formulario Completo)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Cotizaciones   NUEVA COTIZACIÓN              [Guardar Borrador] [Enviar] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  DATOS GENERALES                                                           │
│  ┌──────────────────────────────────┬──────────────┬──────────────────┐   │
│  │ Cliente *                        │ Fecha *       │ Vigencia        │   │
│  │ [Buscar cliente...             ▼]│ [13/11/2024] │ [15 días      ▼]│   │
│  └──────────────────────────────────┴──────────────┴──────────────────┘   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ IIMSA Infraestructura Industrial SA de CV                            │ │
│  │ RFC: III-880415-AB7 · Contacto: Ing. Roberto Flores · ☎ 55-1234-5678│ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  PRODUCTOS                                          [+ Agregar línea]      │
│  ┌────┬──────────────────────────────┬──────┬──────┬──────────┬─────────┐ │
│  │ #  │ Producto / SKU               │ Unid │ Cant │  P.Unit  │ Importe │ │
│  ├────┼──────────────────────────────┼──────┼──────┼──────────┼─────────┤ │
│  │  1 │ [Buscar producto...        ] │  TON │  5   │ $18,500  │ $92,500 │ │
│  │    │ PTR 4"x4"x6m C-14 · PTR-4X4 │      │      │ 💡 $19,200│         │ │
│  │    │                              │      │      │ ⚠️ Bajo mín│         │ │
│  ├────┼──────────────────────────────┼──────┼──────┼──────────┼─────────┤ │
│  │  2 │ Perfil IPR 6" · IPR-6-9M     │  PZA │  20  │  $1,250  │ $25,000 │ │
│  │    │                              │      │      │ 💡 $1,280 │         │ │
│  ├────┼──────────────────────────────┼──────┼──────┼──────────┼─────────┤ │
│  │  3 │ [Buscar producto...        ] │      │      │          │         │ │
│  └────┴──────────────────────────────┴──────┴──────┴──────────┴─────────┘ │
│    💡 = Precio sugerido ML    ⚠️ = Precio bajo mínimo (requiere aprobación)│
│                                                                            │
│  NOTAS                                              TOTALES                │
│  ┌────────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ Entrega en obra de cliente.        │  │ Subtotal:      $117,500.00  │  │
│  │ Incluye flete zona metropolitana.  │  │ IVA (16%):      $18,800.00  │  │
│  │                                    │  │ ─────────────────────────── │  │
│  └────────────────────────────────────┘  │ TOTAL:         $136,300.00  │  │
│                                          │ Moneda: MXN                 │  │
│  ENVÍO                                   └─────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ ○ Solo generar PDF    ● Enviar por WhatsApp    ○ Enviar por Email     │ │
│  │ WhatsApp: [+52 55 9876 5432          ]  (número del contacto)         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│                    [Cancelar]  [Guardar Borrador]  [Generar y Enviar →]    │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Lista de Cotizaciones

```
┌────────────────────────────────────────────────────────────────────────────┐
│ COTIZACIONES                                          [+ Nueva Cotización] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Buscar: [                          ]  Vendedor: [Todos ▼]  Fecha: [▼]   │
│                                                                            │
│  Estado: [Todas ▼] [Borrador] [Enviada] [Aceptada] [Rechazada] [Vencida] │
│                                                                            │
│  ┌──────────────┬──────────────────────────┬────────┬──────────┬────────┐ │
│  │ Folio        │ Cliente                  │ Total  │ Estado   │ Acciones│ │
│  ├──────────────┼──────────────────────────┼────────┼──────────┼────────┤ │
│  │ COT-2024-0142│ Constructora Ramírez      │$45,200 │ ENVIADA  │ ⋮      │ │
│  │ 13/11/2024   │ Ing. Héctor Ramírez       │        │ Vence 3d │        │ │
│  ├──────────────┼──────────────────────────┼────────┼──────────┼────────┤ │
│  │ COT-2024-0141│ Ferretería El Clavo SA    │ $8,900 │ BORRADOR │ ⋮      │ │
│  │ 12/11/2024   │ María González            │        │          │        │ │
│  ├──────────────┼──────────────────────────┼────────┼──────────┼────────┤ │
│  │ COT-2024-0139│ IIMSA Infraestructura     │$120,000│✅ ACEPTADA│ ⋮     │ │
│  │ 08/11/2024   │ Ing. Roberto Flores       │        │          │        │ │
│  ├──────────────┼──────────────────────────┼────────┼──────────┼────────┤ │
│  │ COT-2024-0138│ Estructuras Modernas SA   │$67,500 │ ENVIADA  │ ⋮      │ │
│  │ 07/11/2024   │ Arq. Patricia Luna        │        │ Vence 9d │        │ │
│  ├──────────────┼──────────────────────────┼────────┼──────────┼────────┤ │
│  │ COT-2024-0135│ Metalúrgica del Bajío     │$38,900 │❌ RECHAZADA│ ⋮    │ │
│  │ 01/11/2024   │ Luis Hernández            │        │          │        │ │
│  └──────────────┴──────────────────────────┴────────┴──────────┴────────┘ │
│                                                                            │
│  Mostrando 1–5 de 47 cotizaciones          [← Anterior] 1 2 3 ... [Sig. →]│
│                                                                            │
│  ⋮ Menú contextual:                                                        │
│    ├── Ver detalle                                                         │
│    ├── Duplicar cotización                                                 │
│    ├── Descargar PDF                                                       │
│    ├── Reenviar WhatsApp                                                   │
│    ├── Convertir a Venta (solo ACEPTADA)                                   │
│    └── Cancelar                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Control de Inventario

```
┌────────────────────────────────────────────────────────────────────────────┐
│ INVENTARIO                          [+ Registrar Entrada]  [Ajuste ▼]     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Buscar: [                    ]  Categoría: [Todas ▼]  ⚠️ Solo bajo mínimo│
│                                                                            │
│  RESUMEN  │ Total SKUs: 312 │ Valor Inventario: $4,285,600 │ 🔴 Alertas:8 │
│                                                                            │
│ ┌────────────┬────────────────────────────┬────┬───────┬──────┬──────────┐│
│ │ SKU        │ Descripción                │ UN │ Stock │ Min. │ Estado   ││
│ ├────────────┼────────────────────────────┼────┼───────┼──────┼──────────┤│
│ │ PTR-4X4-14 │ PTR 4"x4"x6m Cal.14        │PZA │  12   │  20  │🔴 BAJO  ││
│ │            │                            │    │       │      │ Comprar  ││
│ ├────────────┼────────────────────────────┼────┼───────┼──────┼──────────┤│
│ │ IPR-6-9M   │ Perfil IPR 6" × 9m         │PZA │   0   │  10  │🔴 AGOT. ││
│ │            │                            │    │       │      │ Urgente  ││
│ ├────────────┼────────────────────────────┼────┼───────┼──────┼──────────┤│
│ │ LAM-3-4X8  │ Lámina Cal.3 4'×8'         │PZA │  45   │  30  │🟡 OK    ││
│ ├────────────┼────────────────────────────┼────┼───────┼──────┼──────────┤│
│ │ ANGL-2-6M  │ Ángulo 2"x2"x3/16"×6m      │PZA │ 180   │  50  │🟢 BIEN  ││
│ ├────────────┼────────────────────────────┼────┼───────┼──────┼──────────┤│
│ │ RND-1-6M   │ Redondo sólido 1"×6m        │PZA │  95   │  40  │🟢 BIEN  ││
│ ├────────────┼────────────────────────────┼────┼───────┼──────┼──────────┤│
│ │ CAN-2-6M   │ Canalón 2"×4"×6m Cal.14    │PZA │  23   │  25  │🟡 BAJO  ││
│ └────────────┴────────────────────────────┴────┴───────┴──────┴──────────┘│
│                                                                            │
│  Click en fila → Kardex del producto                                       │
│                                                                            │
│  ┌─── KARDEX: PTR 4"x4"x6m Cal.14 ──────────────────────────────────┐    │
│  │ Fecha      │ Tipo      │ Referencia        │ Entrada│ Salida│Saldo│    │
│  ├────────────┼───────────┼───────────────────┼────────┼───────┼─────┤    │
│  │ 13/11/2024 │ VENTA     │ VTA-2024-0089     │        │    5  │  12 │    │
│  │ 10/11/2024 │ COMPRA    │ OC-2024-0021      │   20   │       │  17 │    │
│  │ 08/11/2024 │ VENTA     │ VTA-2024-0085     │        │    3  │  -3 │    │
│  └────────────┴───────────┴───────────────────┴────────┴───────┴─────┘    │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Búsqueda de Proveedores

```
┌────────────────────────────────────────────────────────────────────────────┐
│ PROVEEDORES                                           [+ Nuevo Proveedor]  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Buscar: [aceros del norte              ]  Zona: [Todas ▼]  ☑ Con stock   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ ACEROS DEL NORTE SA de CV                                  ⭐⭐⭐⭐⭐ │  │
│  │ RFC: AND-850312-KJ4                                                 │  │
│  │ Contacto: Ing. Carlos Mendoza  ☎ 81-8765-4321                      │  │
│  │ Monterrey, NL · Entrega: 3–5 días hábiles                          │  │
│  │ Condiciones pago: 30 días neto                                      │  │
│  │ ┌──────────────┬─────────────────────────────┬──────┬────────────┐ │  │
│  │ │ SKU          │ Descripción                 │ P.Proveedor│ Plazo│ │  │
│  │ ├──────────────┼─────────────────────────────┼────────────┼──────┤ │  │
│  │ │ PTR-4X4-14   │ PTR 4"x4"×6m Cal.14         │  $820/pza  │ 3d   │ │  │
│  │ │ IPR-6-9M     │ Perfil IPR 6"×9m            │  $1,180/pza│ 5d   │ │  │
│  │ │ ANGL-2-6M    │ Ángulo 2"×2"×3/16"×6m       │  $245/pza  │ 3d   │ │  │
│  │ └──────────────┴─────────────────────────────┴────────────┴──────┘ │  │
│  │  Histórico: 24 órdenes · $890,000 comprado · 97% entregas a tiempo  │  │
│  │  [Ver perfil completo]  [Crear Orden de Compra]                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ PERFILES INDUSTRIALES SA de CV                             ⭐⭐⭐⭐   │  │
│  │ RFC: PIS-920618-MN2                                                 │  │
│  │ Contacto: Lic. Ana Torres  ☎ 55-2345-6789  · CDMX                 │  │
│  │ Entrega: 1–2 días hábiles (local)  · Pago: contado                 │  │
│  │ Histórico: 31 órdenes · $1,240,000 · 89% entregas a tiempo         │  │
│  │ [Ver perfil completo]  [Crear Orden de Compra]                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Aprobación de Precios (Vista Gerente)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ APROBACIÓN DE PRECIOS                                  🔴 3 pendientes     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ COT-2024-0142 · IIMSA Infraestructura                                │ │
│  │ Vendedor: Juan García · Solicitado: hace 2 horas                     │ │
│  │                                                                      │ │
│  │ LÍNEA CON PRECIO BAJO MÍNIMO:                                        │ │
│  │ ┌──────────────────┬─────────────┬──────────┬──────────┬──────────┐ │ │
│  │ │ Producto         │ Cant.       │ P.Mínimo │ P.Oferta │ Diff.   │ │ │
│  │ ├──────────────────┼─────────────┼──────────┼──────────┼──────────┤ │ │
│  │ │ PTR 4"x4"×6m     │   50 pzas   │ $900     │ $820     │ -8.9%   │ │ │
│  │ │ Cal.14           │             │ (costo + │ (ofertado│ ⚠️ Rojo  │ │ │
│  │ │                  │             │ 12% mrg) │ por Juan)│         │ │ │
│  │ └──────────────────┴─────────────┴──────────┴──────────┴──────────┘ │ │
│  │                                                                      │ │
│  │ Motivo del vendedor:                                                 │ │
│  │ "Cliente compra 50 piezas regulares, necesitamos retenerlo.          │ │
│  │  Propongo precio especial por volumen."                              │ │
│  │                                                                      │ │
│  │ Nota de rechazo (opcional):                                          │ │
│  │ ┌──────────────────────────────────────────────────────────────┐    │ │
│  │ │ Precio mínimo autorizado: $870. Ajustar.                     │    │ │
│  │ └──────────────────────────────────────────────────────────────┘    │ │
│  │                                                                      │ │
│  │  [Ver cotización completa]  [Rechazar con nota →]  [Aprobar ✓]      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ COT-2024-0140 · Constructora Ramírez  (hace 5 horas)                │ │
│  │ [Expandir ▼]                                                         │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ COT-2024-0138 · Metalúrgica del Bajío  (ayer)                       │ │
│  │ [Expandir ▼]                                                         │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Versión Mobile

### 8a. Menú Hamburguesa

```
┌──────────────────────────┐
│ ☰  FreeLux CRM      🔔 3│
├──────────────────────────┤
│                          │
│  👤 Juan García          │
│  Vendedor                │
│  ─────────────────────── │
│  📊 Dashboard            │
│  📋 Nueva Cotización     │
│  💰 Mis Ventas           │
│  👥 Clientes             │
│  📦 Productos            │
│  📥 Inventario           │
│  ─────────────────────── │
│  ⚙️ Configuración        │
│  🚪 Cerrar sesión         │
│                          │
└──────────────────────────┘
```

### 8b. Cotización Simplificada (Mobile)

```
┌──────────────────────────┐
│ ← Nueva Cotización       │
├──────────────────────────┤
│ Cliente *                │
│ [Buscar cliente...    ▼] │
│                          │
│ ─ Producto 1 ────────── │
│ [Buscar producto...   ▼] │
│ Cant: [___]  $/u:[_____]│
│ Subtotal: $0.00          │
│                          │
│ [+ Agregar producto]     │
│                          │
│ ─────────────────────── │
│ Subtotal:      $0.00     │
│ IVA 16%:       $0.00     │
│ TOTAL:         $0.00     │
│ ─────────────────────── │
│                          │
│ Envío:                   │
│ ○ WhatsApp  ○ Email      │
│ ○ Solo PDF               │
│                          │
│ ┌──────────────────────┐ │
│ │  GENERAR COTIZACIÓN  │ │
│ └──────────────────────┘ │
│                          │
│ [Guardar borrador]       │
└──────────────────────────┘
```

**Notas de UX Mobile**:
- Teclado numérico automático para campos de cantidad y precio
- El PDF se abre en visor nativo del teléfono
- WhatsApp abre la app nativa con mensaje prellenado
- Scroll infinito en listas (no paginación con clicks)
- Pull-to-refresh en todas las listas
- Swipe derecho en cotización → Duplicar
- Swipe izquierdo en cotización → Cancelar (con confirmación)
