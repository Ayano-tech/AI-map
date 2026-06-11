"use client";
import { useState, useEffect, use } from "react";

interface ResponseData {
  testScore: number;
  basic: Record<string, string>;
  submittedAt: string;
  surveyAnswers: Record<string, string | string[]>;
}

interface CompanyData {
  id: string;
  name: string;
  industry: string;
  employeeCount: string;
  code: string;
  createdAt: string;
}

function usageScore(r: ResponseData): number {
  const ans = r.surveyAnswers?.["Q7-2"] as string | undefined;
  if (ans === "業務で日常的に使っている") return 85;
  if (ans === "試したことはある（業務以外含む）") return 50;
  return 15;
}

function computePositioning(responses: ResponseData[]) {
  const points = responses.map((r) => ({
    x: (r.testScore / 20) * 100,
    y: usageScore(r),
  }));
  const counts = { promoter: 0, knowledge: 0, selfStyle: 0, notStarted: 0 };
  points.forEach((p) => {
    if (p.x >= 50 && p.y >= 50) counts.promoter++;
    else if (p.x >= 50 && p.y < 50) counts.knowledge++;
    else if (p.x < 50 && p.y >= 50) counts.selfStyle++;
    else counts.notStarted++;
  });
  const total = points.length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  return { points, counts, total, pct };
}

export default function ReportPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [phase, setPhase] = useState<"auth" | "loading" | "view" | "error">("auth");
  const [inputCode, setInputCode] = useState("");
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (inputCode.toUpperCase() === code.toUpperCase() && code.length > 0) {
      setPhase("loading");
    }
  }, [inputCode, code]);

  useEffect(() => {
    if (phase !== "loading") return;
    fetch(`/api/report/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === "not_found") {
          setErrorMsg("企業情報が見つかりません");
          setPhase("error");
          return;
        }
        setCompany(data.company);
        setResponses(data.responses || []);
        setPhase("view");
      })
      .catch(() => {
        setErrorMsg("データの取得に失敗しました");
        setPhase("error");
      });
  }, [phase, code]);

  if (phase === "auth") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A2740] to-[#2D4A7A] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <p className="text-xs text-center tracking-[4px] text-shin-mid mb-1">POWERED BY SHIN</p>
          <h1 className="text-2xl font-bold text-center text-shin-charcoal mb-2">診断結果レポート</h1>
          <p className="text-shin-mid text-sm text-center mb-6">担当者よりお伝えしたアクセスコードを入力してください</p>
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="例：ABC123"
            className="w-full border-2 border-shin-accent rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest focus:outline-none focus:border-shin-blue mb-4"
            maxLength={8}
          />
          <button
            onClick={() => {
              if (inputCode.toUpperCase() !== code.toUpperCase()) {
                setErrorMsg("コードが一致しません");
              } else {
                setPhase("loading");
              }
            }}
            className="w-full bg-shin-blue text-white rounded-xl py-3 font-semibold hover:bg-shin-blue-dark transition-colors"
          >
            レポートを確認する →
          </button>
          {errorMsg && <p className="text-red-500 text-sm text-center mt-3">{errorMsg}</p>}
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#F5F8FC] flex items-center justify-center">
        <p className="text-shin-mid">読み込み中...</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#F5F8FC] flex items-center justify-center">
        <p className="text-red-500">{errorMsg}</p>
      </div>
    );
  }

  const { points, counts, pct, total } = computePositioning(responses);
  const avgScore =
    responses.length > 0
      ? Math.round(responses.reduce((s, r) => s + r.testScore, 0) / responses.length)
      : 0;

  return (
    <div className="min-h-screen bg-[#F5F8FC]">
      <header className="bg-shin-dark text-white px-6 py-4">
        <p className="text-[#BCC8DE] text-xs tracking-[4px]">POWERED BY SHIN</p>
        <h1 className="text-lg font-bold">生成AI活用診断レポート</h1>
        {company && <p className="text-[#BCC8DE] text-sm mt-0.5">{company.name}</p>}
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-shin-charcoal mb-4">回答状況</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-shin-blue-pale rounded-xl p-4">
              <p className="text-3xl font-bold text-shin-blue">{total}</p>
              <p className="text-shin-mid text-sm mt-1">回答者数</p>
            </div>
            <div className="bg-shin-blue-pale rounded-xl p-4">
              <p className="text-3xl font-bold text-shin-blue">{avgScore}<span className="text-base font-normal text-shin-mid">/20</span></p>
              <p className="text-shin-mid text-sm mt-1">平均スコア</p>
            </div>
            <div className="bg-shin-blue-pale rounded-xl p-4">
              <p className="text-3xl font-bold text-shin-blue">{pct(counts.promoter)}<span className="text-base font-normal text-shin-mid">%</span></p>
              <p className="text-shin-mid text-sm mt-1">推進層比率</p>
            </div>
          </div>
        </div>

        {/* Positioning Map */}
        {responses.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-shin-charcoal mb-1">AI活用ポジショニングマップ</h2>
            <p className="text-shin-mid text-xs mb-4">縦軸：AI活用頻度（実践度）／横軸：AIリテラシー（知識・スキル）</p>
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="grid grid-cols-[20px_1fr] grid-rows-[1fr_20px] gap-2 w-full max-w-xs">
                <div className="row-start-1 col-start-1 flex items-center justify-center">
                  <span className="-rotate-90 whitespace-nowrap text-xs text-shin-light">活用頻度 高 ↑</span>
                </div>
                <div className="row-start-1 col-start-2 relative aspect-square rounded-xl border border-shin-accent overflow-hidden">
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    <div className="border-b border-r border-shin-accent bg-blue-50 p-2"><span className="text-xs font-semibold text-blue-700">知識先行層</span></div>
                    <div className="border-b border-shin-accent bg-green-50 p-2 flex items-start justify-end"><span className="text-xs font-semibold text-green-700">推進層</span></div>
                    <div className="border-r border-shin-accent bg-gray-50 p-2 flex items-end"><span className="text-xs font-semibold text-shin-mid">未着手層</span></div>
                    <div className="bg-yellow-50 p-2 flex items-end justify-end"><span className="text-xs font-semibold text-yellow-700">我流活用層</span></div>
                  </div>
                  {points.map((p, i) => (
                    <div key={i} className="absolute w-3 h-3 rounded-full bg-shin-blue border-2 border-white shadow"
                      style={{ left: `calc(${p.x}% - 6px)`, top: `calc(${100 - p.y}% - 6px)` }} />
                  ))}
                </div>
                <div className="row-start-2 col-start-2 text-center text-xs text-shin-light">AIリテラシー 高 →</div>
              </div>
              <div className="flex-1 space-y-2 text-sm w-full">
                <div className="flex justify-between items-center bg-green-50 rounded-lg px-3 py-2"><span className="font-semibold text-green-700">推進層</span><span className="font-bold">{counts.promoter}名（{pct(counts.promoter)}%）</span></div>
                <div className="flex justify-between items-center bg-blue-50 rounded-lg px-3 py-2"><span className="font-semibold text-blue-700">知識先行層</span><span className="font-bold">{counts.knowledge}名（{pct(counts.knowledge)}%）</span></div>
                <div className="flex justify-between items-center bg-yellow-50 rounded-lg px-3 py-2"><span className="font-semibold text-yellow-700">我流活用層</span><span className="font-bold">{counts.selfStyle}名（{pct(counts.selfStyle)}%）</span></div>
                <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2"><span className="font-semibold text-shin-mid">未着手層</span><span className="font-bold">{counts.notStarted}名（{pct(counts.notStarted)}%）</span></div>
              </div>
            </div>
          </div>
        )}

        {responses.length === 0 && (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center text-shin-mid">
            まだ回答データがありません
          </div>
        )}

        <div className="bg-shin-blue-pale border border-shin-blue rounded-xl p-5 text-sm text-shin-charcoal">
          <p className="font-semibold mb-1">詳細な診断レポートについて</p>
          <p className="text-shin-mid">全回答が集まり次第、SHINの担当者より詳細な生成AI活用診断レポートをご提供いたします。ご不明な点はご担当者までお問い合わせください。</p>
        </div>
      </div>
    </div>
  );
}
