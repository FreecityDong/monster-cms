// src/app/sections/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE, authFetch, getToken } from "@/lib/api";

type Me = {
  id: number;
  username: string;
  role: "manager" | "registrar" | "teacher" | "student";
};
type Course = { id: number; code: string; title: string };
type Section = {
  id: number;
  course: number;
  course_title: string;
  section_code: string;
  term: string;
  teacher: number;
  teacher_username: string;
  capacity: string;
  status: "draft" | "published" | "archived";
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
};

export default function SectionsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [list, setList] = useState<Section[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [editing, setEditing] = useState<Section | null>(null);
  const [teachers, setTeachers] = useState<{ id: number; username: string }[]>(
    []
  );

  const canWrite =
    !!me &&
    (me.role === "manager" || me.role === "registrar" || me.role === "teacher");

  const emptyForm = () => ({
    course: "",
    section_code: "",
    term: "",
    teacher: me?.role === "teacher" ? String(me.id) : "",
    capacity: "50",
    status: "draft" as Section["status"],
    start_date: "",
    end_date: "",
  });

  const [form, setForm] = useState(emptyForm());

  function showMessage(text: string) {
    setMsg(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMsg(""), 3000);
  }

  // 当前用户
  useEffect(() => {
    const token = getToken();
    if (!token) {
      location.href = "/login";
      return;
    }
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((u: Me) => {
        setMe(u);
        if (u.role === "teacher") {
          setForm((s) => ({ ...s, teacher: String(u.id) }));
        }
      })
      .catch(() => setMe(null));
  }, []);

  // 加载列表
  async function load() {
    setLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await authFetch(`/api/sections/${q}`);
      setList(data);
    } catch (e: any) {
      showMessage(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  // 加载课程下拉
  async function loadCourses() {
    try {
      const data = await authFetch("/api/courses/");
      setCourses(data);
    } catch {
      /* ignore */
    }
  }

  async function loadTeachers() {
    try {
      const data = await authFetch("/auth/teachers");
      setTeachers(data);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    loadCourses();
    loadTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 表单前端校验（最小）
  function validateForm(): string | null {
    if (!form.course) return "⚠️ 请选择课程";
    if (!form.section_code.trim()) return "⚠️ 请输入班号";
    if (!form.term.trim()) return "⚠️ 请输入学期";
    if (!form.teacher && me?.role !== "teacher") return "⚠️ 请输入教师ID";
    return null;
  }

  // 创建
  async function createSection(e: React.FormEvent) {
    e.preventDefault();
    const err = validateForm();
    if (err) return showMessage(err);

    const payload: any = {
      course: Number(form.course),
      section_code: form.section_code.trim(),
      term: form.term.trim(),
      teacher: Number(form.teacher || (me?.role === "teacher" ? me.id : "")),
      capacity: Number(form.capacity) || 0,
      status: form.status,
    };
    if (form.start_date) payload.start_date = form.start_date;
    if (form.end_date) payload.end_date = form.end_date;

    try {
      await authFetch("/api/sections/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setForm(emptyForm());
      await load();
      showMessage("✅ 创建成功");
    } catch (e: any) {
      showMessage(e.message);
    }
  }

  // 开始编辑
  function startEdit(section: Section) {
    setEditing(section);
    setForm({
      course: String(section.course),
      section_code: section.section_code,
      term: section.term,
      teacher: String(section.teacher),
      capacity: section.capacity,
      status: section.status,
      start_date: section.start_date || "",
      end_date: section.end_date || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 更新
  async function updateSection(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const err = validateForm();
    if (err) return showMessage(err);

    const payload: any = {
      course: Number(form.course),
      section_code: form.section_code,
      term: form.term,
      teacher: Number(form.teacher),
      capacity: Number(form.capacity),
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    try {
      await authFetch(`/api/sections/${editing.id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setEditing(null);
      setForm(emptyForm());
      await load();
      showMessage("✅ 更新成功");
    } catch (e: any) {
      showMessage(e.message);
    }
  }

  // 删除
  async function removeSection(id: number) {
    if (!confirm("确定删除该班级？")) return;
    try {
      await authFetch(`/api/sections/${id}/`, { method: "DELETE" });
      await load();
      showMessage("✅ 删除成功");
    } catch (e: any) {
      showMessage(e.message);
    }
  }

  return (
    <main className="p-6 space-y-6">
      {/* Toast */}
      {msg && (
        <div className="fixed top-6 right-6 bg-green-600 text-white px-4 py-2 rounded shadow-md z-50 transition-opacity duration-500">
          {msg}
        </div>
      )}

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">班级管理</h1>
        <div className="text-sm text-gray-600">当前角色：{me?.role || "-"}</div>
      </header>

      {/* 搜索 */}
      <div className="flex gap-2">
        <input
          className="border p-2 rounded w-64"
          placeholder="按学期/班号/课程代码/教师搜索"
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

      {/* 新建/编辑表单（可写角色可见） */}
      {canWrite && (
        <section className="border rounded p-4 space-y-3 bg-white shadow-sm">
          <h2 className="font-semibold">{editing ? "编辑班级" : "新建班级"}</h2>

          <form
            onSubmit={editing ? updateSection : createSection}
            className="grid grid-cols-2 gap-3 text-gray-700"
          >
            {/* 课程 */}
            <select
              className="border p-2 rounded"
              required
              value={form.course}
              onChange={(e) =>
                setForm((s) => ({ ...s, course: e.target.value }))
              }
            >
              <option value="">选择课程</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>

            {/* 班号 */}
            <input
              className="border p-2 rounded"
              placeholder="班号（如 1 / A / 2025-1）"
              required
              value={form.section_code}
              onChange={(e) =>
                setForm((s) => ({ ...s, section_code: e.target.value }))
              }
            />

            {/* 学期 */}
            <input
              className="border p-2 rounded"
              placeholder="学期（如 2025 Spring）"
              required
              value={form.term}
              onChange={(e) => setForm((s) => ({ ...s, term: e.target.value }))}
            />

            {/* 教师ID（teacher 自动填充为自己并禁用） */}
            {/* 教师选择 */}
            {me?.role === "teacher" ? (
              <input
                className="border p-2 rounded bg-gray-100"
                value={`${me.username} (#${me.id})`}
                disabled
              />
            ) : (
              <select
                className="border p-2 rounded"
                required
                value={form.teacher}
                onChange={(e) =>
                  setForm((s) => ({ ...s, teacher: e.target.value }))
                }
              >
                <option value="">选择教师</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.username} (#{t.id})
                  </option>
                ))}
              </select>
            )}

            {/* 容量 */}
            <input
              className="border p-2 rounded"
              type="number"
              min={1}
              placeholder="容量"
              value={form.capacity}
              onChange={(e) =>
                setForm((s) => ({ ...s, capacity: e.target.value }))
              }
            />

            {/* 状态 */}
            <select
              className="border p-2 rounded"
              value={form.status}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  status: e.target.value as Section["status"],
                }))
              }
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>

            {/* 起止日期 */}
            <input
              className="border p-2 rounded"
              type="date"
              value={form.start_date}
              onChange={(e) =>
                setForm((s) => ({ ...s, start_date: e.target.value }))
              }
            />
            <input
              className="border p-2 rounded"
              type="date"
              value={form.end_date}
              onChange={(e) =>
                setForm((s) => ({ ...s, end_date: e.target.value }))
              }
            />

            <button
              type="submit"
              className="bg-black text-white px-4 py-2 rounded col-span-2"
            >
              {editing ? "保存修改" : "创建"}
            </button>

            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyForm());
                }}
                className="col-span-2 text-sm text-gray-600 underline"
              >
                取消编辑
              </button>
            )}
          </form>
        </section>
      )}

      {/* 列表 */}
      <section className="border rounded overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">课程</th>
              <th className="text-left p-2">学期</th>
              <th className="text-left p-2">班号</th>
              <th className="text-left p-2">教师</th>
              <th className="text-left p-2">容量</th>
              <th className="text-left p-2">状态</th>
              <th className="text-left p-2">创建时间</th>
              <th className="text-left p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const canManage =
                !!me &&
                (me.role === "manager" ||
                  me.role === "registrar" ||
                  (me.role === "teacher" && s.teacher === me.id));

              return (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{s.id}</td>
                  <td className="p-2">{s.course_title}</td>
                  <td className="p-2">{s.term}</td>
                  <td className="p-2">{s.section_code}</td>
                  <td className="p-2">
                    {s.teacher_username} (#{s.teacher})
                  </td>
                  <td className="p-2">{s.capacity}</td>
                  <td className="p-2">{s.status}</td>
                  <td className="p-2">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td className="p-2 space-x-2">
                    {canManage ? (
                      <>
                        <button
                          onClick={() => startEdit(s)}
                          className="text-blue-600 hover:underline"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => removeSection(s.id)}
                          className="text-red-600 hover:underline"
                        >
                          删除
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={9}>
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
