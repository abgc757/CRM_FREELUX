# Plantilla de Cotización

El archivo original `DOCS/COTIZACION.pdf` contiene el formato oficial de cotización usado por la ferretería.

## Estructura de la cotización

```
+------------------------------------------+
|          FERRECRM - COTIZACIÓN            |
|        [Logo de la empresa]              |
|        RFC: XXXX-XXXXXX-XXX              |
+------------------------------------------+
| Folio: COT-202606-0001                   |
| Fecha: 02/06/2026                        |
| Válida hasta: 17/06/2026                 |
+------------------------------------------+
| Cliente: [Nombre]                        |
| RFC: [RFC]                               |
| Contacto: [Teléfono / Email]             |
+------------------------------------------+
| Cant. | SKU      | Descripción    | P/U  |
|-------+----------+----------------+------|
|   10  | C050 N20 | PERFIL CUAD... | 70.25|
|    5  | R100 P18 | PERFIL RECT... |134.47|
+------------------------------------------+
| Subtotal:                     $ 1,375.20 |
| Descuento (0%):              $     0.00  |
| IVA (16%):                   $   220.03  |
| TOTAL:                       $ 1,595.23  |
+------------------------------------------+
| Condiciones de pago: Contado             |
| Tiempo de entrega: 5-7 días hábiles      |
| Válido por 15 días                        |
+------------------------------------------+
| Vendedor: [Nombre]                       |
| Autorizó: [Gerente - si aplica descuento]|
+------------------------------------------+
```

## Implementación

La generación de PDF se realiza mediante ReportLab (backend) con:
- Template base con logo y datos fiscales (configurable)
- Tabla de items generada dinámicamente
- Cálculo automático de subtotal, IVA (16%), descuentos
- Código QR con folio para verificación
- Almacenamiento en `/media/quotes/{folio}.pdf`
