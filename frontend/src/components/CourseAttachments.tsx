"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch, API_BASE, getToken } from "@/lib/api";

type Attachment = {
  id: number;
  course: number;
  course_code: string;
  title: string;
  file: string;
  file_url: string;
  size: number;
  uploaded_by: number | null;
  uploaded_by_username: string | null;
  created_at: string;
};

export default function CourseAttachments({
  courseId,
  canWrite,
}: {
  courseId: number;
  canWrite: boolean;
}) {
  const [list, setList] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ---- 前端兜底：把相对路径 /media/... 转成 http://localhost:8000/media/... ----
  function resolveHref(url?: string) {
    if (!url) return "";
    // 已是绝对地址
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    // 相对地址（以 / 开头），拼上 API_BASE
    if (url.startsWith("/")) return `${API_BASE}${url}`;
    // 其他情况原样返回（比如已是 data: 或 blob:）
    return url;
  }

  function toast(text: string) {
    setMsg(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMsg(""), 2500);
  }

  async function load() {
    setLoading(true);
    try {
      const data = await authFetch(
        `/api/course_attachments/?course=${courseId}`
      );
      setList(data);
    } catch (e: any) {
      toast(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); // eslint-disable-next-line
  }, [courseId]);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    fd.set("course", String(courseId));
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/course_attachments/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "上传失败");
      }
      formEl.reset();
      toast("✅ 上传成功");
      await load();
    } catch (err: any) {
      toast(err.message || "上传失败");
    }
  }

  async function remove(id: number) {
    if (!confirm("确定删除该附件？")) return;
    try {
      await authFetch(`/api/course_attachments/${id}/`, { method: "DELETE" });
      toast("✅ 删除成功");
      await load();
    } catch (e: any) {
      toast(e.message);
    }
  }

  return (
    <div className="border rounded p-3 bg-white mt-3">
      {msg && (
        <div className="mb-2 rounded bg-green-600 text-white px-3 py-1 inline-block">
          {msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800">课程附件</h4>
        {loading && <span className="text-sm text-gray-500">加载中…</span>}
      </div>

      {canWrite && (
        <form onSubmit={upload} className="flex items-center gap-2 mt-3">
          <input
            type="text"
            name="title"
            placeholder="标题（可选）"
            className="border rounded p-2"
          />
          <input
            type="file"
            name="file"
            required
            className="border rounded p-1"
          />
          <button className="bg-black text-white px-3 py-2 rounded">
            上传
          </button>
        </form>
      )}

      <table className="min-w-full text-sm mt-4">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="text-left p-2">标题</th>
            <th className="text-left p-2">文件</th>
            <th className="text-left p-2">大小</th>
            <th className="text-left p-2">上传者</th>
            {canWrite && <th className="text-left p-2">操作</th>}
          </tr>
        </thead>
        <tbody>
          {list.map((a) => (
            <tr key={a.id} className="border-t hover:bg-gray-50">
              <td className="p-2">{a.title || "-"}</td>
              <td className="p-2">
                {a.file_url ? (
                  <a
                    className="text-blue-600 underline"
                    href={resolveHref(a.file_url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    下载
                  </a>
                ) : (
                  <span className="text-gray-400">无链接</span>
                )}
              </td>
              <td className="p-2">
                {a.size ? `${(a.size / 1024).toFixed(1)} KB` : "-"}
              </td>
              <td className="p-2">{a.uploaded_by_username || "-"}</td>
              {canWrite && (
                <td className="p-2">
                  <button
                    onClick={() => remove(a.id)}
                    className="text-red-600 hover:underline"
                  >
                    删除
                  </button>
                </td>
              )}
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td className="p-2 text-gray-500" colSpan={canWrite ? 5 : 4}>
                暂无附件
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
