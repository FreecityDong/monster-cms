"use client";

import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const SPECIAL_RE = /[!@#$%^&*()_\-+=\[\]{};':",.<>/?\\|]/;

function extractErrors(payload: any): string {
  try {
    if (!payload) return "未知错误";
    if (typeof payload === "string") return payload;
    if (Array.isArray(payload)) return payload.join("\n");

    // 优先常见键
    const buckets: string[] = [];
    const push = (v: any) => {
      if (!v) return;
      if (Array.isArray(v)) buckets.push(...v.map(String));
      else buckets.push(String(v));
    };

    // 先看 detail / errors
    push((payload as any).detail);
    push((payload as any).errors);

    // 字段级错误（DRF 典型）
    const candidateKeys = [
      "new_password",
      "password",
      "non_field_errors",
      "uid",
      "token",
    ];
    candidateKeys.forEach((k) => {
      if (k in payload) push((payload as any)[k]);
    });

    // 兜底：把所有键都扫一遍（避免遗漏）
    Object.keys(payload).forEach((k) => {
      if (candidateKeys.includes(k) || k === "detail" || k === "errors") return;
      push((payload as any)[k]);
    });

    return buckets.length ? buckets.join("\n") : "未知错误";
  } catch {
    return "未知错误";
  }
}

export default function ResetPasswordPage() {
  const [uid, setUid] = useState("");
  const [token, setToken] = useState("");
  const [np, setNew] = useState("");
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setUid(params.get("uid") || "");
    setToken(params.get("token") || "");
  }, []);

  // 与后端一致的本地校验
  const rules = useMemo(
    () => [
      { key: "len", text: "至少 6 位", pass: np.length >= 6 },
      { key: "upper", text: "至少 1 个大写字母", pass: /[A-Z]/.test(np) },
      { key: "lower", text: "至少 1 个小写字母", pass: /[a-z]/.test(np) },
      { key: "digit", text: "至少 1 个数字", pass: /\d/.test(np) },
      {
        key: "special",
        text: "至少 1 个特殊字符（!@#…）",
        pass: SPECIAL_RE.test(np),
      },
      {
        key: "nonnum",
        text: "不得为纯数字",
        pass: !/^\d+$/.test(np) || np.length === 0,
      },
    ],
    [np]
  );
  const allPass = rules.every((r) => r.pass);

  useEffect(() => {
    if (success && countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    } else if (success && countdown === 0) {
      location.href = "/login";
    }
  }, [success, countdown]);

  const submit = async (e: any) => {
    e.preventDefault();
    setMsg("");
    setSuccess(false);

    // 前置校验：不合规就不发请求（并展示人类可读提示）
    if (!allPass) {
      const unmet = rules
        .filter((r) => !r.pass)
        .map((r) => `✖ ${r.text}`)
        .join("\n");
      setMsg(unmet || "密码不符合规则");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch(`${API}/auth/reset_password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, new_password: np }),
      });

      // 既兼容 JSON，也兼容纯文本
      const raw = await r.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = raw;
      }

      if (r.ok) {
        setSuccess(true);
        setMsg("✅ 密码已重置成功，3 秒后跳转到登录页…");
        setCountdown(3);
      } else {
        setMsg(extractErrors(data));
      }
    } catch {
      setMsg("网络异常，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="p-6 max-w-sm mx-auto space-y-4">
      <h1 className="text-xl font-bold">重置密码</h1>

      <form onSubmit={submit} className="space-y-3">
        <input
          className="border p-2 rounded w-full"
          type="password"
          placeholder="新密码（≥10，含大小写/数字/特殊字符）"
          onChange={(e) => setNew(e.target.value)}
          value={np}
          required
        />

        {/* 规则提示（实时） */}
        <ul className="mt-1 space-y-1 text-sm">
          {rules.map((r) => (
            <li
              key={r.key}
              className={r.pass ? "text-green-600" : "text-red-600"}
            >
              {r.pass ? "✔" : "✖"} {r.text}
            </li>
          ))}
        </ul>

        <button
          className="bg-black text-white px-4 py-2 rounded w-full hover:bg-gray-800 disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? "提交中…" : "提交"}
        </button>
      </form>

      {msg && (
        <div
          className={`text-sm whitespace-pre-line ${
            success ? "text-green-600" : "text-red-600"
          }`}
        >
          {msg} {success && countdown > 0 ? `(${countdown})` : ""}
        </div>
      )}
    </main>
  );
}
