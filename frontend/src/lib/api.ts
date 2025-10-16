export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export async function authFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  // 错误处理
  if (!res.ok) {
    const raw = await res.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }
    const msg = extractErrors(data);
    throw new Error(msg);
  }

  // ✅ 如果没有内容（204 或空字符串），直接返回空对象
  if (res.status === 204) return {};
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function extractErrors(payload: any): string {
  if (!payload) return "未知错误";
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) return payload.join("\n");
  const buckets: string[] = [];
  const push = (v: any) => {
    if (!v) return;
    if (Array.isArray(v)) buckets.push(...v.map(String));
    else buckets.push(String(v));
  };
  push(payload.detail);
  push(payload.errors);
  Object.keys(payload).forEach((k) => {
    if (["detail", "errors"].includes(k)) return;
    push(payload[k]);
  });
  return buckets.length ? buckets.join("\n") : "未知错误";
}
