"use client";
import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

// 允许的“特殊字符”要与后端校验器保持一致
const SPECIAL_RE = /[!@#$%^&*()_\-+=\[\]{};':",.<>/?\\|]/;

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const emailName = useMemo(
    () => (email.includes("@") ? email.split("@")[0] : ""),
    [email]
  );
  const pwLower = password.toLowerCase();
  const unameLower = username.toLowerCase();
  const emailLower = emailName.toLowerCase();

  // 与后端一致的密码规则
  const rules = useMemo(
    () => [
      { key: "len", text: "至少 6 位", pass: password.length >= 6 },
      { key: "upper", text: "至少 1 个大写字母", pass: /[A-Z]/.test(password) },
      { key: "lower", text: "至少 1 个小写字母", pass: /[a-z]/.test(password) },
      { key: "digit", text: "至少 1 个数字", pass: /\d/.test(password) },
      {
        key: "special",
        text: "至少 1 个特殊字符（!@#…）",
        pass: SPECIAL_RE.test(password),
      },
      {
        key: "nonnum",
        text: "不得为纯数字",
        pass: !/^\d+$/.test(password) || password.length === 0,
      },
      {
        key: "nouname",
        text: "不得包含用户名",
        pass: unameLower ? !pwLower.includes(unameLower) : true,
      },
      {
        key: "noemail",
        text: "不得包含邮箱名（@ 前部分）",
        pass: emailLower ? !pwLower.includes(emailLower) : true,
      },
    ],
    [password, unameLower, emailLower]
  );

  const allPass = rules.every((r) => r.pass);

  // 成功后倒计时跳转
  useEffect(() => {
    if (!success) return;
    if (countdown <= 0) {
      location.href = "/login";
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [success, countdown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!allPass) {
      setMsg("请先满足所有密码规则");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await r.json();
      if (r.ok) {
        setSuccess(true);
        setMsg("✅ 注册成功，3 秒后自动跳转到登录页…");
        setCountdown(3);
      } else {
        // data 可能是 {field: [errors]} 或通用 detail
        const merged = Array.isArray(data)
          ? data.join("\n")
          : typeof data === "object"
          ? Object.values(data).flat().join("\n")
          : data.detail || "注册失败";
        setMsg(merged || "注册失败");
      }
    } catch (err) {
      setMsg("网络异常，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">注册</h1>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <input
            className="border p-2 rounded w-full"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <input
            className="border p-2 rounded w-full"
            placeholder="邮箱"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <input
            className="border p-2 rounded w-full"
            type="password"
            placeholder="密码（≥10，含大小写/数字/特殊字符）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {/* 规则提示 */}
          <ul className="mt-2 space-y-1 text-sm">
            {rules.map((r) => (
              <li
                key={r.key}
                className={r.pass ? "text-green-600" : "text-red-600"}
              >
                {r.pass ? "✔" : "✖"} {r.text}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="submit"
          disabled={!allPass || submitting}
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 disabled:opacity-60"
        >
          {submitting ? "提交中…" : "注册"}
        </button>
      </form>

      {/* 提示信息 + 倒计时 */}
      {msg && (
        <p
          className={`mt-3 text-sm whitespace-pre-line ${
            success ? "text-green-600" : "text-red-600"
          }`}
        >
          {msg} {success && countdown > 0 ? `(${countdown})` : ""}
        </p>
      )}

      {/* 常用入口 */}
      <div className="mt-4 text-sm space-x-4 text-blue-600">
        <a href="/login">返回登录</a>
        <a href="/forgot-username">忘记账号</a>
        <a href="/forgot-password">忘记密码</a>
      </div>
    </main>
  );
}
