"use client";

import { useEffect, useState } from "react";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function Dashboard() {
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setMe);

    fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/courses/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => console.log("courses", data));
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/sections/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => console.log("sections", data));
  }, []);

  return (
    <div className="p-6 space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-4 ">Dashboard</h1>
        <pre className="p-4 bg-gray-100 rounded text-gray-700">
          {JSON.stringify(me, null, 2)}
        </pre>
      </div>

      {/* ✅ 修改密码区 */}
      <ChangePasswordForm />

      <div className="flex gap-4 mt-4">
        <a className="text-blue-600 underline" href="/courses">
          课程管理
        </a>
        <a className="text-blue-600 underline" href="/sections">
          班级管理
        </a>
        <a className="text-blue-600 underline" href="/messages">
          通知管理
        </a>
      </div>
    </div>
  );
}
