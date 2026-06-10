"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/lib/auth-store";
import { FreeluxLogo } from "@/components/FreeluxLogo";
import toast from "react-hot-toast";

const schema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router  = useRouter();
  const login   = useAuthStore(s => s.login);
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      router.push("/dashboard");
    } catch {
      toast.error("Email o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>

      {/* ── Left panel ── */}
      <div style={{ width: 420, flexShrink: 0, background: "#000", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 44px" }}
        className="hidden lg:flex">

        <FreeluxLogo size={36} />

        <div>
          <div style={{ width: 32, height: 2, background: "#e55c00", marginBottom: 28 }} />
          <p style={{ fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1.2, letterSpacing: "-.02em" }}>
            Gestión comercial<br />para acero estructural
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginTop: 16, lineHeight: 1.8, maxWidth: 280 }}>
            Cotizaciones, ventas, compras, inventario y cobranza — en una sola plataforma.
          </p>

          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 10 }}>
            {["Catálogo con 4 niveles de precio", "Órdenes de compra y recepción", "Control de crédito y aging report", "Facturación CFDI 4.0 vía Facturama"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#e55c00", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 11, color: "rgba(255,255,255,.2)" }}>© {new Date().getFullYear()} FreeLux Steel</p>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, background: "#f6f6f6", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>

          {/* Mobile logo */}
          <div className="lg:hidden" style={{ marginBottom: 36, background: "#000", display: "inline-flex", padding: "12px 16px", borderRadius: 4 }}>
            <FreeluxLogo size={28} />
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#111", letterSpacing: "-.02em", marginBottom: 6 }}>
            Iniciar sesión
          </h1>
          <p style={{ fontSize: 13, color: "#999", marginBottom: 32 }}>Ingresa tus credenciales de acceso</p>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Correo electrónico</label>
              <input {...register("email")} type="email" placeholder="usuario@freelux.mx"
                className="input" autoComplete="email" />
              {errors.email && <p style={{ fontSize: 11, color: "#c00", marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="label">Contraseña</label>
              <div style={{ position: "relative" }}>
                <input {...register("password")} type={showPass ? "text" : "password"}
                  placeholder="••••••••" className="input" style={{ paddingRight: 64 }}
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, fontWeight: 700, color: "#999", letterSpacing: ".06em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer" }}>
                  {showPass ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              {errors.password && <p style={{ fontSize: 11, color: "#c00", marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "10px 0", fontSize: 11 }}>
              {loading
                ? <svg style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
                    <circle opacity=".25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path opacity=".75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                : null}
              Ingresar al sistema
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
