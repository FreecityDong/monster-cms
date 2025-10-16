"use client";

import { useEffect, useState } from "react";
import { API_BASE, authFetch, getToken } from "@/lib/api";
// 顶部引入
import CourseAttachments from "@/components/CourseAttachments";
import CourseBulkIO from "@/components/CourseBulkIO";
import React from "react";

type Course = {
  id: number;
  code: string;
  title: string;
  description?: string;
  credits: string;
  updated_at: string;
};

type Me = {
  id: number;
  username: string;
  role: "manager" | "registrar" | "teacher" | "student";
};

export default function CoursesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [list, setList] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const [form, setForm] = useState({
    code: "",
    title: "",
    description: "",
    credits: "3.0",
  });
  const [msg, setMsg] = useState("");

  const canWrite = me && (me.role === "manager" || me.role === "registrar");

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await authFetch(`/api/courses/${q}`);
      setList(data);
    } catch (e: any) {
      setMsg(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 拉取当前用户
    const token = getToken();
    if (!token) {
      location.href = "/login";
      return;
    }
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    load();
  }, []); // 初次加载

  async function createCourse(e: any) {
    e.preventDefault();
    setMsg("");
    try {
      await authFetch("/api/courses/", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ code: "", title: "", description: "", credits: "3.0" });
      await load();
      setMsg("✅ 创建成功");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function remove(id: number) {
    if (!confirm("确定删除该课程？")) return;
    try {
      await authFetch(`/api/courses/${id}/`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">课程管理</h1>
        <div className="text-sm text-gray-600">当前角色：{me?.role || "-"}</div>
      </header>

      <div className="flex gap-2">
        <input
          className="border p-2 rounded w-64"
          placeholder="按代码/名称搜索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={load}
          className="px-3 py-2 bg-black text-white rounded"
        >
          搜索
        </button>
        {loading && <span className="text-gray-500">加载中…</span>}
      </div>

      {canWrite && (
        <section className="border rounded p-4 space-y-2 bg-white shadow-sm text-gray-700">
          <h2 className="font-semibold">新建课程</h2>
          {/* 批量导入/导出 */}
          <CourseBulkIO canImport={!!canWrite} />
          <form onSubmit={createCourse} className="grid grid-cols-2 gap-3">
            <input
              className="border p-2 rounded text-gray-700"
              placeholder="课程代码"
              required
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
            />
            <input
              className="border p-2 rounded text-gray-700"
              placeholder="课程名称"
              required
              value={form.title}
              onChange={(e) =>
                setForm((s) => ({ ...s, title: e.target.value }))
              }
            />
            <input
              className="border p-2 rounded col-span-2 text-gray-700"
              placeholder="描述"
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
            />
            <input
              className="border p-2 rounded w-28 text-gray-700"
              placeholder="学分"
              value={form.credits}
              onChange={(e) =>
                setForm((s) => ({ ...s, credits: e.target.value }))
              }
            />
            <button className="bg-black text-white px-4 py-2 rounded col-span-2 text-gray-700">
              创建
            </button>
          </form>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
        </section>
      )}

      <section className="border rounded overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">代码</th>
              <th className="text-left p-2">名称</th>
              <th className="text-left p-2">学分</th>
              <th className="text-left p-2">更新时间</th>
              <th className="text-left p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <React.Fragment key={c.id}>
                {/* 第一行：课程信息 */}
                <tr className="border-t">
                  <td className="p-2">{c.id}</td>
                  <td className="p-2">{c.code}</td>
                  <td className="p-2">{c.title}</td>
                  <td className="p-2">{c.credits}</td>
                  <td className="p-2">
                    {new Date(c.updated_at).toLocaleString()}
                  </td>
                  <td className="p-2 space-x-3">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => setOpenId(openId === c.id ? null : c.id)}
                    >
                      {openId === c.id ? "收起附件" : "管理附件"}
                    </button>

                    {canWrite ? (
                      <button
                        onClick={() => remove(c.id)}
                        className="text-red-600 hover:underline"
                      >
                        删除
                      </button>
                    ) : (
                      <span className="text-gray-400 align-middle">-</span>
                    )}
                  </td>
                </tr>

                {/* 第二行：附件管理块 */}
                {openId === c.id && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <CourseAttachments
                        courseId={c.id}
                        canWrite={!!canWrite}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}

            {list.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={6}>
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
