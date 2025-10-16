"use client";
import { useState } from "react";
console.log("API_BASE:", process.env.NEXT_PUBLIC_API_BASE);
export default function Page() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  async function submit(e: any) {
    e.preventDefault();
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await r.json();
    if (data.access) {
      localStorage.setItem("token", data.access);
      location.href = "/dashboard";
    } else alert("登录失败");
  }
  return (
    <form
      onSubmit={submit}
      className="max-w-sm mx-auto mt-24 flex flex-col gap-3"
    >
      <input
        className="border p-2 rounded text-gray-700"
        placeholder="用户名"
        onChange={(e) => setU(e.target.value)}
      />
      <input
        className="border p-2 rounded text-gray-700"
        type="password"
        placeholder="密码"
        onChange={(e) => setP(e.target.value)}
      />
      <button className="bg-black text-white py-2 rounded ">登录</button>
      <div className="text-sm space-x-4 text-blue-600 text-gray-700">
        <a href="/register">注册账号</a>
        <a href="/forgot-username">忘记账号</a>
        <a href="/forgot-password">忘记密码</a>
      </div>
    </form>
  );
}
