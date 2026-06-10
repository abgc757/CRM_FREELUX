import axios from "axios";

// En producción (Render) llamamos directo al backend — sin proxy.
// En local usamos localhost. La URL se detecta en runtime por hostname.
const isLocal =
  typeof window === "undefined" || window.location.hostname === "localhost";

export const BACKEND_ORIGIN = isLocal
  ? "http://localhost:8000"
  : "https://crm-freelux-backend.onrender.com";

const API_BASE = `${BACKEND_ORIGIN}/api/v1`;

export const api = axios.create({ baseURL: API_BASE });

const BACKEND = BACKEND_ORIGIN;

/**
 * Descarga un archivo del backend con el JWT de sesión y lo abre en nueva pestaña.
 * Acepta rutas relativas (/media/...) o URLs completas del backend (/api/v1/...).
 */
export async function openFile(path: string): Promise<void> {
  const url = path.startsWith("http") ? path : `${BACKEND}${path}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Error ${res.status} al descargar archivo`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${API_BASE}/auth/refresh`,
            { refresh_token: refresh }
          );
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
