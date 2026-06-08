# Formato de Cotización — Aceros y Perfiles FreeLux

## Datos de la Empresa Emisora

| Campo | Valor |
|---|---|
| **Razón Social** | ACEROS Y PERFILES FREELUX SA DE CV |
| **RFC** | FME121108UI1 |
| **Dirección** | AV. 20 DE NOVIEMBRE MZ. 26 LOCAL 105, PARQUE INDUSTRIAL NAUCALPAN, NAUCALPAN DE JUÁREZ, ESTADO DE MÉXICO, CP 53370 |
| **Teléfono** | (55) 5389-4721 · (55) 5389-4722 |
| **Email** | ventas@freelux.mx |
| **Web** | www.freelux.mx |

---

## Estructura del Documento

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    [LOGO ACEROS Y PERFILES]                              │
│                                                                          │
│  ACEROS Y PERFILES FREELUX SA DE CV          COTIZACIÓN                 │
│  RFC: FME121108UI1                                                       │
│  AV. 20 DE NOVIEMBRE MZ. 26 L. 105                                      │
│  NAUCALPAN DE JUÁREZ, MEX. CP 53370                                     │
│  Tel: (55) 5389-4721  ventas@freelux.mx                                 │
│                                                                          │
├──────────────────────────────────┬───────────────────────────────────────┤
│  FOLIO:  COT-2024-0142           │  FECHA:     13/11/2024               │
│  VIGENCIA: 28/11/2024            │  MONEDA:    MXN (Pesos Mexicanos)    │
│  VENDEDOR: Juan García López     │  CONDICIONES: Contado                │
├──────────────────────────────────┴───────────────────────────────────────┤
│                                                                          │
│  DATOS DEL CLIENTE                                                       │
│  ──────────────────────────────────────────────────────────────────     │
│  EMPRESA:   IIMSA INFRAESTRUCTURA INDUSTRIAL SA DE CV                   │
│  RFC:       III880415AB7                                                 │
│  CONTACTO:  ING. ROBERTO FLORES JIMÉNEZ                                 │
│  TELÉFONO:  +52 55 1234 5678                                             │
│  DIRECCIÓN: BLVD. MANUEL ÁVILA CAMACHO 32, POLANCO, CDMX CP 11560      │
│                                                                          │
├──────┬────────────────────────────────────────┬──────┬──────┬───────────┬───────────┤
│CLAVE │ DESCRIPCIÓN                            │ UNID │ CANT │   P.UNIT  │  IMPORTE  │
├──────┼────────────────────────────────────────┼──────┼──────┼───────────┼───────────┤
│PTR-  │ PTR 4"x4"x6m Calibre 14               │ PZA  │  50  │  $900.00  │$45,000.00 │
│4X4-  │ Tubo estructural rectangular A36       │      │      │           │           │
│14-6M │ Espesor 1.9mm · Peso 38.5 kg/pza       │      │      │           │           │
├──────┼────────────────────────────────────────┼──────┼──────┼───────────┼───────────┤
│IPR-  │ Perfil IPR 6" × 9 metros               │ PZA  │  20  │$1,250.00  │$25,000.00 │
│6-9M  │ Acero ASTM A36 · Doble T               │      │      │           │           │
│      │ Peso: 8.89 kg/m · 80 kg/pza            │      │      │           │           │
├──────┼────────────────────────────────────────┼──────┼──────┼───────────┼───────────┤
│ANGL- │ Ángulo 2"×2"×3/16"×6m                  │ PZA  │ 100  │  $245.00  │$24,500.00 │
│2-6M  │ Acero A36 · Sin alas                   │      │      │           │           │
├──────┼────────────────────────────────────────┼──────┼──────┼───────────┼───────────┤
│LAM-  │ Lámina Cal.12 4'×8' Rolada en Frío     │ PZA  │  15  │$1,680.00  │$25,200.00 │
│12-RF │ Espesor 2.77mm · Acabado brillante     │      │      │           │           │
│4X8   │ Dimensiones: 1,219mm × 2,438mm         │      │      │           │           │
├──────┼────────────────────────────────────────┼──────┼──────┼───────────┼───────────┤
│RND-  │ Redondo sólido liso 1" × 6m            │ PZA  │  30  │  $380.00  │$11,400.00 │
│1-6M  │ Acero 1018 CR · Torneado               │      │      │           │           │
└──────┴────────────────────────────────────────┴──────┴──────┴───────────┴───────────┘

                                              ┌──────────────────────────────┐
                                              │  SUBTOTAL:     $131,100.00   │
                                              │  IVA (16%):     $20,976.00   │
                                              │  ──────────────────────────  │
                                              │  TOTAL:        $152,076.00   │
                                              └──────────────────────────────┘

  NOTAS:
  • Entrega en obra del cliente: Blvd. M. Ávila Camacho 32, Polanco, CDMX.
  • Incluye flete Zona Metropolitana del Valle de México.
  • Maniobras de descarga a cargo del cliente.
  • Tiempo de entrega estimado: 3 a 5 días hábiles a partir de confirmación.
  • Material disponible sujeto a confirmación de inventario al momento del pedido.

  ─────────────────────────────────────────────────────────────────────────
  ⚠️  TODOS LOS PRECIOS SON MÁS IVA
  ⚠️  PRECIOS SUJETOS A CAMBIO SIN PREVIO AVISO
  ─────────────────────────────────────────────────────────────────────────

  Atentamente,                              Autorización de compra:
  ____________________________              ____________________________
  Juan García López                         Nombre y firma del cliente
  Vendedor · FreeLux CRM                    RFC: ____________________
  (55) 5389-4721 ext. 102                   Fecha: __________________
  juan.garcia@freelux.mx

└──────────────────────────────────────────────────────────────────────────┘
```

---

## Campos del Encabezado

| Campo | Descripción | Generado por |
|---|---|---|
| **Folio** | `COT-YYYY-NNNN` autoincremental, único | Sistema |
| **Fecha** | Fecha de creación de la cotización | Sistema (UTC-6) |
| **Vigencia** | Fecha de expiración = Fecha + `validity_days` (default 15) | Sistema |
| **Moneda** | MXN por defecto; puede ser USD para exportación | Vendedor |
| **Condiciones** | Contado, 15 días, 30 días, etc. | Vendedor |
| **Vendedor** | Nombre completo del usuario que crea la cotización | Sistema |

## Campos del Cliente Receptor

| Campo | Validación |
|---|---|
| **Empresa** | Obligatorio, máx. 120 caracteres |
| **RFC** | Patrón: `^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$` |
| **Contacto** | Nombre del comprador o responsable |
| **Teléfono** | Formato libre, incluye lada |
| **Dirección de entrega** | Puede diferir de la dirección fiscal |

## Tabla de Conceptos

| Columna | Tipo | Descripción |
|---|---|---|
| **CLAVE** | Texto | SKU del producto en el sistema |
| **DESCRIPCIÓN** | Texto | Nombre + especificaciones técnicas del producto |
| **UNIDAD** | Catálogo | PZA (pieza), TON (tonelada), ML (metro lineal), KG |
| **CANT** | Numérico | Cantidad solicitada |
| **P.UNIT** | Moneda | Precio unitario **sin IVA** |
| **IMPORTE** | Moneda | CANT × P.UNIT |

## Pie de Página — Totales

```
SUBTOTAL = Σ(IMPORTE por línea)
IVA      = SUBTOTAL × 0.16          (tasa vigente México 2024)
TOTAL    = SUBTOTAL + IVA
```

**Notas legales obligatorias**:
1. "Todos los precios son más IVA" — indica que el precio unitario NO incluye impuesto
2. "Precios sujetos a cambio sin previo aviso" — protege ante volatilidad del acero
3. "Material disponible sujeto a confirmación de inventario al momento del pedido"

---

## Categorías de Productos Frecuentes

| Categoría | Ejemplos de SKU | Unidad habitual |
|---|---|---|
| **PTR (Tubo Rect.)** | PTR-2X4-16-6M, PTR-3X3-14-6M, PTR-4X4-14-6M, PTR-6X6-12-6M | PZA |
| **Perfiles** | IPR-4-6M, IPR-6-9M, IPR-8-9M, IPN-80, IPN-100 | PZA |
| **Ángulos** | ANGL-1.5-6M, ANGL-2-6M, ANGL-3-6M | PZA |
| **Canal (U)** | CAN-2X4-14-6M, CAN-3X5-12-6M | PZA |
| **Redondo sólido** | RND-0.5-6M, RND-1-6M, RND-1.5-6M | PZA |
| **Lámina** | LAM-10-RF-4X8, LAM-12-RF-4X8, LAM-14-GV-4X8 | PZA |
| **Tubería** | TUB-1-6M, TUB-1.5-6M, TUB-2-6M | PZA |
| **Placa** | PLC-3-4X8, PLC-6-4X8, PLC-12-4X8 | PZA |
| **Varilla** | VAR-3/8-12M, VAR-1/2-12M, VAR-5/8-12M | TON |

---

## Ejemplo de PDF Generado (ReportLab)

El archivo PDF se genera en formato carta (215.9 × 279.4 mm) con:

- **Encabezado**: Logo izquierda + datos empresa derecha + franja de color corporativo
- **Información de cotización**: Cuadro de 2 columnas con folio, fecha, vigencia, moneda
- **Datos del cliente**: Recuadro gris claro
- **Tabla de conceptos**: Cabecera con fondo azul oscuro, filas alternas blanco/gris claro
- **Totales**: Cuadro alineado a la derecha con borde doble
- **Pie**: Notas en italic + firma del vendedor + campo de autorización cliente
- **Número de página**: "Página 1 de N" centrado en el pie
- **Marca de agua**: "COTIZACIÓN" diagonal en gris claro (solo en versión PDF, no en pantalla)

### Parámetros de Configuración del PDF

```python
# backend/app/services/quotes.py
PDF_CONFIG = {
    "page_size": "LETTER",            # 215.9 x 279.4 mm
    "margin_left": 15,                # mm
    "margin_right": 15,               # mm
    "margin_top": 20,                 # mm
    "margin_bottom": 20,              # mm
    "font_family": "Helvetica",
    "font_size_body": 8,              # pt
    "font_size_header": 10,           # pt
    "color_primary": "#1E3A5F",       # Azul oscuro corporativo
    "color_secondary": "#F0F4F8",     # Gris claro para filas alternas
    "logo_path": "assets/logo_freelux.png",
    "logo_width": 50,                 # mm
    "validity_days_default": 15,
    "iva_rate": 0.16,
    "footer_text": "Todos los precios son más IVA · Precios sujetos a cambio sin previo aviso",
}
```
