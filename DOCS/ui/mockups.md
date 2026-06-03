# Mockups de UI

## Layout general (Desktop)

```
┌──────────────┬────────────────────────────────────────────┐
│  FerreCRM    │  📅 martes, 2 de junio de 2026            │
│              │                                            │
│  📊 Dashboard│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  👥 Clientes │  │20    │ │1800+ │ │5     │ │$0    │      │
│  📦 Productos│  │Client│ │Prod  │ │Cots  │ │Ventas│      │
│  📄 Cots     │  └──────┘ └──────┘ └──────┘ └──────┘      │
│  🛒 Ventas   │                                            │
│  🚚 Provs    │  ┌─────────────────────┐                   │
│  📦 Compras  │  │ Acceso rápido       │                   │
│  🏭 Inventario│ │ [Nuevo Cliente]     │                   │
│              │  │ [Nueva Cotización]  │                   │
│              │  └─────────────────────┘                   │
│              │                                            │
│  👤 Admin    │                                            │
│  🚪 Salir    │                                            │
└──────────────┴────────────────────────────────────────────┘
```

## Layout Mobile

```
┌─────────────────────┐
│ ☰ FerreCRM    📅    │
├─────────────────────┤
│                     │
│ ┌──────┐ ┌──────┐  │
│ │20    │ │1800+ │  │
│ │Client│ │Prod  │  │
│ └──────┘ └──────┘  │
│ ┌──────┐ ┌──────┐  │
│ │5     │ │$0    │  │
│ │Cots  │ │Ventas│  │
│ └──────┘ └──────┘  │
│                     │
│ [Nuevo Cliente]    │
│ [Nueva Cotización] │
│                     │
└─────────────────────┘
```

## Paleta de colores

- Primary: Blue (#2563eb)
- Background: Gray 50 (#f9fafb)
- Cards: White (#ffffff)
- Text: Gray 900 (#111827)
- Success: Green (#16a34a)
- Warning: Yellow (#ca8a04)
- Danger: Red (#dc2626)

## Componentes reutilizables

### `Card`
Contenedor blanco con sombra suave, border redondeado.

### `Button`
- `btn-primary`: azul, para acciones principales
- `btn-secondary`: gris, para acciones secundarias
- `btn-danger`: rojo, para eliminar

### `Input`
Campos de texto con borde, focus ring azul.

### `Table`
Tablas responsive con scroll horizontal en mobile.

### `Badge`
Etiquetas de estado: borrador, aprobada, convertida, etc.

### `Sidebar`
Menú lateral colapsable en mobile, fijo en desktop.
