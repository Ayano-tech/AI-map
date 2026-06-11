"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      sessionStorage.setItem("admin_auth", "true");
      router.push("/admin/dashboard");
    } else {
      setError("PINコードが正しくありません");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(160deg, #1A2A3E 0%, #2A4A6E 50%, #6AA3D8 100%)" }}>
      <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-sm">
        <h1 className="text-shin-charcoal text-xl font-bold mb-2">管理者ログイン</h1>
        <p className="text-shin-mid text-sm mb-6">管理者PINコードを入力してください</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="PINコード（英数字8文字）" maxLength={8} className="w-full border border-shin-accent rounded-lg px-4 py-2.5 focus:outline-none focus:border-shin-blue" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-shin-blue text-white rounded-lg px-6 py-2.5 font-semibold shadow-md hover:bg-shin-blue-dark transition-colors">ログイン</button>
        </form>
        <div className="mt-4 text-center"><a href="/" className="text-shin-mid text-sm hover:text-shin-blue">← トップに戻る</a></div>
      </div>
    </div>
  );
}
