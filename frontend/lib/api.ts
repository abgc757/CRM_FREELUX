import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
});

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace("/api/v1", "");

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
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
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
