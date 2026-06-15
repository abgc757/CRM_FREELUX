"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore, UserRole } from "@/lib/auth-store";
import { FreeluxLogo } from "@/components/FreeluxLogo";
import {
  LayoutDashboard, Package, Users, FileText, CreditCard,
  ShoppingCart, Warehouse, AlertCircle, BarChart3,
  LogOut, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem { href: string; label: string; icon: React.ElementType; roles: UserRole[]; }

const NAV_SECTIONS = [
  {
    title: "Principal",
    items: [
      { href: "/dashboard",          label: "Dashboard",    icon: LayoutDashboard, roles: ["gerencia","administracion","ventas","compras","almacen"] },
      { href: "/dashboard/products", label: "Productos",    icon: Package,         roles: ["gerencia","administracion","ventas","compras","almacen"] },
      { href: "/dashboard/clients",  label: "Clientes",     icon: Users,           roles: ["gerencia","administracion","ventas"] },
    ],
  },
  {
    title: "Comercial",
    items: [
      { href: "/dashboard/quotes",   label: "Cotizaciones", icon: FileText,        roles: ["gerencia","administracion","ventas"] },
      { href: "/dashboard/sales",    label: "Ventas",       icon: CreditCard,      roles: ["gerencia","administracion","ventas"] },
    ],
  },
  {
    title: "Operaciones",
    items: [
      { href: "/dashboard/purchases",   label: "Compras",    icon: ShoppingCart, roles: ["gerencia","administracion","compras"] },
      { href: "/dashboard/inventory",   label: "Inventario", icon: Warehouse,    roles: ["gerencia","administracion","almacen","compras"] },
      { href: "/dashboard/collections", label: "Cobranza",   icon: AlertCircle,  roles: ["gerencia","administracion"] },
      { href: "/dashboard/reports",     label: "Reportes",   icon: BarChart3,    roles: ["gerencia","administracion"] },
    ],
  },
] as const;

const ROLE_LABELS: Record<UserRole, string> = {
  gerencia: "Gerencia", administracion: "Administración",
  ventas: "Ventas", compras: "Compras", almacen: "Almacén",
};

function SidebarContent({ onClose, isActive }: { onClose: () => void; isActive: (href: string) => boolean }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  if (!user) return null;

  return (
    <aside style={{ width: 224, background: "#000", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo + close on mobile */}
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <FreeluxLogo size={28} />
        <button
          onClick={onClose}
          className="lg:hidden"
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)", padding: 4, borderRadius: 4, display: "flex" }}
          aria-label="Cerrar menú"
        >
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
        {NAV_SECTIONS.map(section => {
          const visible = section.items.filter(i => (i.roles as readonly string[]).includes(user.role));
          if (!visible.length) return null;
          return (
            <div key={section.title} style={{ marginBottom: 4 }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.2)", padding: "10px 10px 4px" }}>
                {section.title}
              </p>
              {visible.map(item => {
                const Icon  = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 10px", borderRadius: 5, marginBottom: 1,
                      fontSize: 13, fontWeight: 500, position: "relative",
                      transition: "background .1s, color .1s",
                      color: active ? "#fff" : "rgba(255,255,255,.45)",
                      background: active ? "rgba(255,255,255,.09)" : "transparent",
                      textDecoration: "none",
                      minHeight: 44,
                    }}>
                    {active && (
                      <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 18, background: "#e55c00", borderRadius: "0 3px 3px 0" }} />
                    )}
                    <Icon style={{ width: 16, height: 16, flexShrink: 0, color: active ? "#e55c00" : "rgba(255,255,255,.25)", transition: "color .1s" }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, background: "#1a1a1a", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,.6)", flexShrink: 0 }}>
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
              {user.full_name}
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: ".06em", textTransform: "uppercase", marginTop: 2 }}>
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        <button
          onClick={() => { logout(); router.replace("/login"); }}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.25)", letterSpacing: ".06em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", padding: "6px 0", transition: "color .15s", width: "100%" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.25)")}>
          <LogOut style={{ width: 13, height: 13 }} />
          Salir del sistema
        </button>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (!isAuthenticated()) router.replace("/login"); }, [isAuthenticated, router]);

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!user) return null;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  // Derive current section label for mobile topbar
  const allItems = NAV_SECTIONS.flatMap(s => [...s.items]);
  const currentItem = allItems.find(i => isActive(i.href));

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "#f6f6f6" }}>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex" style={{ flexShrink: 0 }}>
        <SidebarContent onClose={() => {}} isActive={isActive} />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden"
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}
        >
          {/* Backdrop */}
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.65)", backdropFilter: "blur(2px)" }}
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div style={{ position: "relative", zIndex: 51, display: "flex", flexShrink: 0, animation: "slideIn 220ms ease" }}>
            <SidebarContent onClose={() => setOpen(false)} isActive={isActive} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Mobile topbar */}
        <header
          className="lg:hidden"
          style={{ background: "#000", borderBottom: "1px solid #1a1a1a", height: 52, display: "flex", alignItems: "center", padding: "0 14px", gap: 12, flexShrink: 0 }}
        >
          <button
            onClick={() => setOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.6)", display: "flex", padding: 8, marginLeft: -8, borderRadius: 4 }}
            aria-label="Abrir menú"
          >
            <Menu style={{ width: 20, height: 20 }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            {currentItem ? (
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-.01em" }}>
                {currentItem.label}
              </p>
            ) : (
              <FreeluxLogo size={22} />
            )}
          </div>
          {/* User avatar */}
          <div style={{ width: 30, height: 30, background: "#1a1a1a", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.5)", flexShrink: 0 }}>
            {user.full_name.charAt(0).toUpperCase()}
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto" }}>
          <div className="page-content">
            {children}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
