"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore, UserRole } from "@/lib/auth-store";
import { FreeluxLogo } from "@/components/FreeluxLogo";
import {
  LayoutDashboard, Package, Users, FileText, CreditCard,
  ShoppingCart, Warehouse, AlertCircle, BarChart3,
  LogOut, Menu, X, ChevronRight,
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (!isAuthenticated()) router.replace("/login"); }, [isAuthenticated, router]);
  if (!user) return null;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const Sidebar = () => (
    <aside style={{ width: 224, background: "#000", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #1a1a1a" }}>
        <FreeluxLogo size={30} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
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
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: 4, marginBottom: 1,
                      fontSize: 12, fontWeight: 500, position: "relative",
                      transition: "background .1s, color .1s",
                      color: active ? "#fff" : "rgba(255,255,255,.4)",
                      background: active ? "rgba(255,255,255,.07)" : "transparent",
                      textDecoration: "none",
                    }}>
                    {active && (
                      <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 2, height: 16, background: "#e55c00", borderRadius: "0 2px 2px 0" }} />
                    )}
                    <Icon style={{ width: 14, height: 14, flexShrink: 0, color: active ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.25)", transition: "color .1s" }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, background: "#1a1a1a", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.5)", flexShrink: 0 }}>
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
              {user.full_name}
            </p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,.25)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 2 }}>
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        <button onClick={() => { logout(); router.replace("/login"); }}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.25)", letterSpacing: ".06em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", padding: "4px 0", transition: "color .15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.25)")}>
          <LogOut style={{ width: 12, height: 12 }} />
          Salir
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f6f6f6" }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex" style={{ flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden" style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex" }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)" }} onClick={() => setOpen(false)} />
          <div style={{ position: "relative", zIndex: 50, display: "flex", width: 224 }}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Mobile topbar */}
        <header className="lg:hidden" style={{ background: "#000", borderBottom: "1px solid #1a1a1a", height: 48, display: "flex", alignItems: "center", padding: "0 16px", gap: 14, flexShrink: 0 }}>
          <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.5)", display: "flex" }}>
            <Menu style={{ width: 18, height: 18 }} />
          </button>
          <FreeluxLogo size={24} />
        </header>

        <main style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 28px" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
