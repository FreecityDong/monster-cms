"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE, authFetch, getToken } from "@/lib/api";

type TaskStatus = {
  state: "PENDING" | "STARTED" | "PROGRESS" | "SUCCESS" | "FAILURE";
  meta?: any;
  result?: any;
  error?: string;
} | null;

function resolveHref(url?: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}

export default function CourseBulkIO({
  canImport = false,
}: {
  canImport?: boolean;
}) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [task, setTask] = useState<TaskStatus>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  function toast(text: string) {
    setMsg(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMsg(""), 2500);
  }

  async function pollOnce(id: string) {
    try {
      const s = await authFetch(`/api/tasks/${id}`);
      setTask(s);
      if (s.state === "SUCCESS") {
        if (s.result?.download_url) {
          const url = resolveHref(s.result.download_url);
          // 立即打开下载链接
          window.open(url, "_blank", "noopener");
          toast("✅ 导出完成，正在下载…");
        } else {
          toast("✅ 任务完成");
        }
        clearTimer();
        setExporting(false);
        setImporting(false);
      } else if (s.state === "FAILURE") {
        toast("❌ 任务失败：" + (s.error || ""));
        clearTimer();
        setExporting(false);
        setImporting(false);
      }
    } catch (e: any) {
      // 轮询失败不打断，下一轮再试
      console.warn("poll error:", e?.message || e);
    }
  }

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  // 导出
  async function startExport() {
    try {
      setExporting(true);
      setTask(null);
      setTaskId(null);
      const data = await authFetch("/api/exports/courses", { method: "POST" });
      setTaskId(data.task_id);
      toast(`📤 已提交导出任务（task_id: ${data.task_id.slice(0, 8)}…）`);
    } catch (e: any) {
      setExporting(false);
      toast(e.message || "提交导出失败");
    }
  }

  // 导入
  async function startImport(file: File | null) {
    if (!file) return toast("请选择 CSV 文件");
    try {
      setImporting(true);
      setTask(null);
      setTaskId(null);
      const token = getToken();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/api/imports/courses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "提交导入失败");
      }
      const data = await res.json();
      setTaskId(data.task_id);
      toast(`📥 已提交导入任务（task_id: ${data.task_id.slice(0, 8)}…）`);
    } catch (e: any) {
      setImporting(false);
      toast(e.message || "提交导入失败");
    }
  }

  // 轮询
  useEffect(() => {
    if (!taskId) return;
    // 先拉一次，随后每2秒轮询
    let active = true;
    (async () => {
      await pollOnce(taskId);
      if (!active) return;
      const id = setInterval(() => pollOnce(taskId), 2000);
      // @ts-ignore
      timerRef.current = id as any;
    })();
    return () => {
      active = false;
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  return (
    <section className="border rounded p-4 bg-white shadow-sm text-gray-700">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">批量导入 / 导出</h2>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {/* 导出 */}
        <button
          disabled={exporting || importing}
          onClick={startExport}
          className={`px-3 py-2 rounded text-white ${
            exporting || importing ? "bg-gray-400" : "bg-black hover:opacity-90"
          }`}
          title="导出课程为 CSV"
        >
          {exporting ? "导出中…" : "导出课程 CSV"}
        </button>

        {/* 导入（仅管理员/教务） */}
        {canImport && (
          <label className="inline-flex items-center gap-2">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => startImport(e.target.files?.[0] || null)}
              disabled={exporting || importing}
              className="block"
            />
            <span className="text-sm text-gray-600">选择 CSV 自动导入</span>
          </label>
        )}
      </div>

      {/* 任务状态展示（可选） */}
      {taskId && (
        <div className="mt-3 text-sm">
          <div className="text-gray-600">
            任务 ID：
            <code className="bg-gray-100 px-1 py-0.5 rounded">{taskId}</code>
          </div>
          <div className="text-gray-600 mt-1">
            状态：<strong>{task?.state || "PENDING"}</strong>
            {task?.state === "PROGRESS" && task?.meta && (
              <span className="ml-2 text-gray-500">
                {typeof task.meta.ok === "number"
                  ? `已处理 ${task.meta.ok}`
                  : ""}{" "}
                {typeof task.meta.fail === "number"
                  ? `失败 ${task.meta.fail}`
                  : ""}
              </span>
            )}
          </div>
          {task?.state === "SUCCESS" && task?.result?.download_url && (
            <div className="mt-2">
              <a
                className="text-blue-600 underline"
                href={resolveHref(task.result.download_url)}
                target="_blank"
                rel="noreferrer"
              >
                下载导出文件
              </a>
            </div>
          )}
          {task?.state === "FAILURE" && task?.error && (
            <div className="mt-2 text-red-600">错误：{task.error}</div>
          )}
        </div>
      )}

      {/* CSV 模板快速说明（可选） */}
      <div className="mt-4 text-xs text-gray-500">
        <div>
          导入 CSV 表头示例：<code>id,code,title,description,credits</code>
        </div>
        <div>
          <strong>code</strong> 必填，作为自然键；同 code 再导入将更新其它字段。
        </div>
      </div>
    </section>
  );
}
