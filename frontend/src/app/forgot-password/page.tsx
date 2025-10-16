"use client";
import { useState } from "react";
const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export default function ForgotPassword() {
  const [email, setE] = useState("");
  const [msg, setMsg] = useState("");
  const submit = async (e: any) => {
    e.preventDefault();
    setMsg("");
    const r = await fetch(`${API}/auth/forgot_password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await r.json();
    setMsg(data.detail || "若邮箱存在，我们已发送重置邮件");
  };
  return (
    <main className="p-6 max-w-sm mx-auto space-y-3">
      <h1 className="text-xl font-bold">忘记密码</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="border p-2 rounded w-full"
          placeholder="注册邮箱"
          onChange={(e) => setE(e.target.value)}
        />
        <button className="bg-black text-white px-4 py-2 rounded">
          发送重置邮件
        </button>
      </form>
      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
