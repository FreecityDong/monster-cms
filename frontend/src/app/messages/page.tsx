"use client";
import { useEffect, useMemo, useState } from "react";
import { API_BASE, authFetch, getToken } from "@/lib/api";

type Me = {
  id: number;
  username: string;
  role: "manager" | "registrar" | "teacher" | "student";
};

type Delivery = {
  id: number;
  announcement: number;
  announcement_title: string;
  announcement_body: string;
  publisher: string;
  publish_at: string | null;
  state: "queued" | "delivered" | "acknowledged";
  delivered_at?: string | null;
  ack_at?: string | null;
  created_at: string;
};

type Announcement = {
  id: number;
  title: string;
  body: string;
  status: "draft" | "published" | "withdrawn";
  created_at: string;
};

export default function MessagesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<"inbox" | "mine">("inbox");

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
      .then(setMe);
  }, []);

  useEffect(() => {
    if (
      me?.role === "teacher" ||
      me?.role === "manager" ||
      me?.role === "registrar"
    )
      setTab("mine");
    else setTab("inbox");
  }, [me]);

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">消息中心</h1>
        <div className="text-sm text-gray-600">当前角色：{me?.role || "-"}</div>
      </header>

      <div className="flex gap-3 border-b pb-2">
        <button
          className={`px-3 py-1 rounded ${
            tab === "inbox" ? "bg-black text-white" : "bg-gray-100"
          }`}
          onClick={() => setTab("inbox")}
        >
          收件箱
        </button>
        {(me?.role === "teacher" ||
          me?.role === "manager" ||
          me?.role === "registrar") && (
          <button
            className={`px-3 py-1 rounded ${
              tab === "mine" ? "bg-black text-white" : "bg-gray-100"
            }`}
            onClick={() => setTab("mine")}
          >
            我发布的
          </button>
        )}
      </div>

      {tab === "inbox" && <Inbox />}
      {tab === "mine" && (
        <Mine
          canWrite={
            !!(
              me &&
              (me.role === "teacher" ||
                me.role === "manager" ||
                me.role === "registrar")
            )
          }
        />
      )}
    </main>
  );
}

function Inbox() {
  const [list, setList] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await authFetch("/api/deliveries?state=pending");
      setList(data);
    } catch (e: any) {
      setMsg(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function delivered(id: number) {
    try {
      await authFetch(`/api/deliveries/${id}/delivered/`, { method: "POST" });
      await load();
    } catch {}
  }
  async function ack(id: number) {
    try {
      await authFetch(`/api/deliveries/${id}/ack/`, { method: "POST" });
      await load();
    } catch (e: any) {
      alert(e.message || "确认失败");
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={load}
          className="px-3 py-2 bg-black text-white rounded"
        >
          刷新
        </button>
        {loading && <span className="text-gray-500">加载中…</span>}
        {msg && <span className="text-sm text-red-600">{msg}</span>}
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="p-2 text-left">标题</th>
            <th className="p-2 text-left">发布者</th>
            <th className="p-2 text-left">发布时间</th>
            <th className="p-2 text-left">状态</th>
            <th className="p-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {list.map((d) => (
            <tr key={d.id} className="border-t">
              <td className="p-2">{d.announcement_title}</td>
              <td className="p-2">{d.publisher}</td>
              <td className="p-2">
                {d.publish_at ? new Date(d.publish_at).toLocaleString() : "-"}
              </td>
              <td className="p-2">
                {d.state === "acknowledged"
                  ? "已确认"
                  : d.state === "delivered"
                  ? "待确认(已展示)"
                  : "待确认"}
              </td>
              <td className="p-2 space-x-3">
                {d.state === "queued" && (
                  <button
                    onClick={() => delivered(d.id)}
                    className="text-blue-600 underline"
                  >
                    标记已展示
                  </button>
                )}
                {d.state !== "acknowledged" && (
                  <button
                    onClick={() => ack(d.id)}
                    className="text-green-700 underline"
                  >
                    确认已读
                  </button>
                )}
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td className="p-4 text-gray-500" colSpan={5}>
                暂无待确认消息
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function Mine({ canWrite }: { canWrite: boolean }) {
  const [list, setList] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await authFetch("/api/announcements/?mine=1");
      setList(data);
    } catch (e: any) {
      setMsg(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: any) {
    e.preventDefault();
    setMsg("");
    try {
      await authFetch("/api/announcements/", {
        method: "POST",
        body: JSON.stringify({ title, body }),
      });
      setTitle("");
      setBody("");
      setMsg("✅ 已发布给全体学生");
      await load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }
  async function withdraw(id: number) {
    if (!confirm("撤回该公告？")) return;
    try {
      await authFetch(`/api/announcements/${id}/withdraw/`, { method: "POST" });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }
  async function stats(id: number) {
    try {
      const s = await authFetch(`/api/announcements/${id}/stats/`);
      alert(
        `确认 ${s.ack_count}/${s.total}，确认率 ${(s.ack_rate * 100).toFixed(
          1
        )}%`
      );
    } catch {}
  }
  async function remind(id: number) {
    try {
      const r = await authFetch(`/api/announcements/${id}/remind_unacked/`, {
        method: "POST",
      });
      alert(`已提醒：${r.reminded}`);
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <section className="space-y-4">
      {canWrite && (
        <form
          onSubmit={create}
          className="border rounded p-4 bg-white shadow-sm grid gap-3"
        >
          <h3 className="font-semibold">发布公告（全体学生）</h3>
          <input
            className="border p-2 rounded"
            placeholder="标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="border p-2 rounded min-h-[120px]"
            placeholder="正文"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <button className="bg-black text-white px-4 py-2 rounded w-fit">
            发布
          </button>
          {msg && <div className="text-sm text-green-600">{msg}</div>}
        </form>
      )}

      <div className="border rounded overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="p-2 text-left">标题</th>
              <th className="p-2 text-left">状态</th>
              <th className="p-2 text-left">创建时间</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.title}</td>
                <td className="p-2">{a.status}</td>
                <td className="p-2">
                  {new Date(a.created_at).toLocaleString()}
                </td>
                <td className="p-2 space-x-3">
                  <button
                    onClick={() => stats(a.id)}
                    className="text-blue-600 underline"
                  >
                    统计
                  </button>
                  {a.status !== "withdrawn" && (
                    <button
                      onClick={() => withdraw(a.id)}
                      className="text-red-600 underline"
                    >
                      撤回
                    </button>
                  )}
                  <button
                    onClick={() => remind(a.id)}
                    className="text-indigo-600 underline"
                  >
                    重发提醒
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={4}>
                  暂无发布
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
