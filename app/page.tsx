"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/companies");
      const data = await res.json();
      const company = data.companies?.find((c: { code: string }) => c.code === code.toUpperCase());
      if (company) {
        router.push(`/survey/${code.toUpperCase()}`);
      } else {
        setError("アクセスコードが正しくありません。担当者にご確認ください。");
      }
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "linear-gradient(160deg, #1A2A3E 0%, #2A4A6E 50%, #6AA3D8 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-[#BCC8DE] text-xs font-semibold mb-3" style={{ letterSpacing: "6px" }}>POWERED BY SHIN</p>
          <h1 className="text-white text-3xl font-bold mb-2">生成AI活用診断</h1>
          <p className="text-[#BCC8DE] text-sm">貴社のAI活用の現在地を可視化します</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-shin-charcoal text-lg font-semibold mb-2">アクセスコードを入力</h2>
          <p className="text-shin-mid text-sm mb-6">担当者からお伝えした6桁のコードを入力してください</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="例：ABC123"
              maxLength={6}
              className="w-full border border-shin-accent rounded-lg px-4 py-3 text-center text-2xl font-bold tracking-widest focus:outline-none focus:border-shin-blue"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading || code.length < 6} className="w-full bg-shin-blue text-white rounded-lg px-6 py-3 font-semibold shadow-md disabled:opacity-50 hover:bg-shin-blue-dark transition-colors">
              {loading ? "確認中..." : "診断を開始する →"}
            </button>
          </form>
        </div>
        <div className="text-center mt-8">
          <a href="/admin" className="text-[#BCC8DE] text-xs hover:text-white transition-colors">管理者の方はこちら</a>
        </div>
      </div>
    </div>
  );
}
