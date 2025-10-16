"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export default function ChangePasswordForm() {
  const [oldp, setOld] = useState("");
  const [np, setNew] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (e: any) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const token = localStorage.getItem("token") || "";
    const r = await fetch(`${API}/auth/change_password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        old_password: oldp,
        new_password: np,
      }),
    });

    const data = await r.json();
    setLoading(false);

    if (r.ok) {
      setMessage("✅ 密码已成功更新");
      setOld("");
      setNew("");
    } else {
      setMessage((data.errors || [data.detail]).join("\n"));
    }
  };

  return (
    <form
      onSubmit={submit}
      className="max-w-sm space-y-3 p-4 border rounded-md shadow-sm bg-white"
    >
      <h2 className="text-lg font-semibold">修改密码</h2>

      <input
        className="border p-2 rounded w-full"
        type="password"
        placeholder="旧密码"
        value={oldp}
        onChange={(e) => setOld(e.target.value)}
      />

      <input
        className="border p-2 rounded w-full"
        type="password"
        placeholder="新密码（≥10 位，含大小写/数字/特殊字符）"
        value={np}
        onChange={(e) => setNew(e.target.value)}
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
      >
        {loading ? "提交中…" : "更新密码"}
      </button>

      {message && (
        <div
          className={`text-sm whitespace-pre-line ${
            message.startsWith("✅") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
