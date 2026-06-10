"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Company } from "@/lib/types";

interface ResponseData {
  testScore: number;
  basic: Record<string, string>;
  chapterScores: Record<string, { score: number; max: number; rate: number }>;
  submittedAt: string;
  surveyAnswers: Record<string, string | string[]>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState({ name: "", industry: "", employeeCount: "" });
  const [adding, setAdding] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("admin_auth") !== "true") {
      router.push("/admin");
    }
  }, [router]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/companies");
      const data = await res.json();
      setCompanies(data.companies || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        setAddForm({ name: "", industry: "", employeeCount: "" });
        fetchCompanies();
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleSelectCompany(company: Company) {
    setSelectedCompany(company);
    setReport(null);
    setShowDetail(true);
    if (company.sheetId) {
      try {
        const res = await fetch(`/api/responses/${company.id}?sheetId=${company.sheetId}`);
        const data = await res.json();
        setResponses(data.responses || []);
      } catch {
        setResponses([]);
      }
    } else {
      setResponses([]);
    }
  }

  async function handleGenerateReport() {
    if (!selectedCompany || responses.length === 0) return;
    setGeneratingReport(true);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: selectedCompany, responses }),
      });
      const data = await res.json();
      setReport(data.report);
    } finally {
      setGeneratingReport(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この企業を削除しますか？")) return;
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    fetchCompanies();
  }

  let parsedReport: Record<string, unknown> | null = null;
  if (report) {
    try { parsedReport = JSON.parse(report); } catch { parsedReport = null; }
  }

  return (
    <div className="min-h-screen bg-[#F5F8FC]">
      <header className="bg-shin-dark text-white px-6 py-4 flex justify-between items-center">
        <div>
          <p className="text-[#BCC8DE] text-xs" style={{ letterSpacing: "4px" }}>株式会社SHIN</p>
          <h1 className="text-lg font-bold">生成AI活用診断 管理画面</h1>
        </div>
        <button onClick={() => { sessionStorage.removeItem("admin_auth"); router.push("/admin"); }} className="text-[#BCC8DE] text-sm hover:text-white">ログアウト</button>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Add Company */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-shin-charcoal font-semibold mb-4">企業を追加</h2>
          <form onSubmit={handleAddCompany} className="flex flex-wrap gap-3">
            <input required value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="企業名 *" className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[160px] focus:outline-none focus:border-shin-blue" />
            <input value={addForm.industry} onChange={e => setAddForm(p => ({ ...p, industry: e.target.value }))} placeholder="業種" className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[120px] focus:outline-none focus:border-shin-blue" />
            <input value={addForm.employeeCount} onChange={e => setAddForm(p => ({ ...p, employeeCount: e.target.value }))} placeholder="従業員数" className="border border-shin-accent rounded-lg px-4 py-2 w-32 focus:outline-none focus:border-shin-blue" />
            <button type="submit" disabled={adding} className="bg-shin-blue text-white rounded-lg px-6 py-2 font-semibold disabled:opacity-50 hover:bg-shin-blue-dark transition-colors">{adding ? "作成中..." : "追加"}</button>
          </form>
        </div>

        {/* Company List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-shin-accent">
            <h2 className="text-shin-charcoal font-semibold">登録企業一覧（{companies.length}社）</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-shin-mid">読み込み中...</div>
          ) : companies.length === 0 ? (
            <div className="p-8 text-center text-shin-mid">企業が登録されていません</div>
          ) : (
            <div className="divide-y divide-shin-accent">
              {companies.map(company => (
                <div key={company.id} className="px-6 py-4 flex items-center justify-between hover:bg-shin-blue-pale transition-colors">
                  <div>
                    <p className="font-semibold text-shin-charcoal">{company.name}</p>
                    <p className="text-shin-mid text-sm">{company.industry} / {company.employeeCount}名</p>
                    <p className="text-shin-light text-xs">{new Date(company.createdAt).toLocaleDateString("ja-JP")} 登録</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-block bg-shin-blue-light text-shin-blue-dark px-3 py-1 rounded-full text-sm font-bold tracking-wider">{company.code}</span>
                    <button onClick={() => handleSelectCompany(company)} className="bg-shin-blue text-white rounded-lg px-4 py-1.5 text-sm font-semibold hover:bg-shin-blue-dark transition-colors">詳細</button>
                    <button onClick={() => handleDelete(company.id)} className="text-red-400 hover:text-red-600 text-sm">削除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-shin-accent flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-shin-charcoal text-lg">{selectedCompany.name}</h3>
              <button onClick={() => setShowDetail(false)} className="text-shin-mid hover:text-shin-charcoal text-2xl">×</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-shin-mid">アクセスコード：</span><span className="font-bold text-shin-blue tracking-widest">{selectedCompany.code}</span></div>
                <div><span className="text-shin-mid">業種：</span>{selectedCompany.industry || "未設定"}</div>
                <div><span className="text-shin-mid">回答数：</span>{responses.length}件</div>
                {selectedCompany.sheetUrl && (
                  <div><a href={selectedCompany.sheetUrl} target="_blank" rel="noopener noreferrer" className="text-shin-blue hover:underline">スプレッドシートを開く →</a></div>
                )}
              </div>

              {responses.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">回答サマリー</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-shin-blue-pale"><th className="px-3 py-2 text-left">回答日時</th><th className="px-3 py-2 text-left">年代</th><th className="px-3 py-2 text-left">職種</th><th className="px-3 py-2 text-center">スコア</th></tr></thead>
                      <tbody>{responses.map((r, i) => (
                        <tr key={i} className="border-b border-shin-accent"><td className="px-3 py-2">{new Date(r.submittedAt).toLocaleDateString("ja-JP")}</td><td className="px-3 py-2">{r.basic?.["Q0-1"] || "-"}</td><td className="px-3 py-2">{r.basic?.["Q0-2"] || "-"}</td><td className="px-3 py-2 text-center font-bold">{r.testScore}/20</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleGenerateReport} disabled={generatingReport || responses.length === 0} className="bg-shin-blue text-white rounded-lg px-6 py-2.5 font-semibold disabled:opacity-50 hover:bg-shin-blue-dark transition-colors">
                  {generatingReport ? "生成中..." : "診断レポートを生成"}
                </button>
                {responses.length === 0 && <p className="text-shin-mid text-sm self-center">回答データがない場合は生成できません</p>}
              </div>

              {parsedReport && (
                <div className="space-y-6 border-t border-shin-accent pt-6">
                  <h4 className="font-bold text-shin-charcoal text-lg">診断レポート</h4>
                  {"executiveSummary" in parsedReport && (
                    <div className="bg-shin-blue-pale rounded-xl p-4">
                      <p className="font-semibold text-shin-charcoal mb-2">エグゼクティブサマリー</p>
                      <p className="text-shin-charcoal">{String(parsedReport.executiveSummary)}</p>
                    </div>
                  )}
                  {"keyInsight" in parsedReport && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <p className="font-semibold text-yellow-800 mb-1">Key Insight</p>
                      <p className="text-yellow-900">{String(parsedReport.keyInsight)}</p>
                    </div>
                  )}
                  {"aiOpportunities" in parsedReport && (() => {
                    if (!parsedReport.aiOpportunities || typeof parsedReport.aiOpportunities !== "object") return null;
                    const opps = parsedReport.aiOpportunities as { quickWins?: Array<{task: string; aiProposal: string; estimatedImpact: string}>; humanInLoop?: Array<{task: string; aiProposal: string; estimatedImpact: string}> };
                    return (
                      <div>
                        <p className="font-semibold mb-3">AI活用機会</p>
                        <div className="space-y-4">
                          {opps.quickWins && opps.quickWins.length > 0 && (
                            <div>
                              <p className="text-green-700 font-medium text-sm mb-2">Quick Win（即効性あり）</p>
                              <div className="space-y-2">
                                {opps.quickWins.map((item, i) => (
                                  <div key={i} className="bg-green-50 rounded-lg p-3 text-sm">
                                    <p className="font-semibold">{item.task}</p>
                                    <p className="text-shin-mid">{item.aiProposal}</p>
                                    <p className="text-green-700 mt-1">効果: {item.estimatedImpact}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {opps.humanInLoop && opps.humanInLoop.length > 0 && (
                            <div>
                              <p className="text-blue-700 font-medium text-sm mb-2">Human-in-the-Loop</p>
                              <div className="space-y-2">
                                {opps.humanInLoop.map((item, i) => (
                                  <div key={i} className="bg-blue-50 rounded-lg p-3 text-sm">
                                    <p className="font-semibold">{item.task}</p>
                                    <p className="text-shin-mid">{item.aiProposal}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {"roadmap" in parsedReport && Array.isArray(parsedReport.roadmap) && (
                    <div>
                      <p className="font-semibold mb-3">実行ロードマップ</p>
                      <div className="space-y-3">
                        {(parsedReport.roadmap as Array<{phase: number; title: string; duration: string; goals: string[]; shinService: string}>).map((phase) => (
                          <div key={phase.phase} className="border border-shin-accent rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-semibold">Phase {phase.phase}: {phase.title}</p>
                              <div className="flex gap-2">
                                <span className="bg-shin-blue-light text-shin-blue-dark text-xs px-2 py-1 rounded-full">{phase.duration}</span>
                                <span className="bg-gray-100 text-shin-mid text-xs px-2 py-1 rounded-full">{phase.shinService}</span>
                              </div>
                            </div>
                            <ul className="text-sm text-shin-mid space-y-1">
                              {phase.goals.map((g, i) => <li key={i}>• {g}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4">
                    <details className="text-xs text-shin-light">
                      <summary className="cursor-pointer">生データ（JSON）を表示</summary>
                      <pre className="mt-2 bg-gray-100 rounded p-3 overflow-x-auto text-xs">{JSON.stringify(parsedReport, null, 2)}</pre>
                    </details>
                  </div>
                </div>
              )}
              {report && !parsedReport && (
                <div className="border-t border-shin-accent pt-6">
                  <p className="font-semibold mb-2">診断レポート（生テキスト）</p>
                  <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">{report}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
