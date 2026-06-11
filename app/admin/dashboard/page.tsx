"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Company } from "@/lib/types";
import DiagnosticReportView from "@/app/admin/components/DiagnosticReportView";

interface ResponseData {
  testScore: number;
  basic: Record<string, string>;
  chapterScores: Record<string, { score: number; max: number; rate: number }>;
  submittedAt: string;
  surveyAnswers: Record<string, string | string[]>;
}

function usageScore(r: ResponseData): number {
  const ans = r.surveyAnswers?.["Q7-2"] as string | undefined;
  if (ans === "業務で日常的に使っている") return 85;
  if (ans === "試したことはある（業務以外含む）") return 50;
  return 15;
}

function computePositioning(responses: ResponseData[]) {
  const points = responses.map(r => ({ x: (r.testScore / 20) * 100, y: usageScore(r) }));
  const counts = { promoter: 0, knowledge: 0, selfStyle: 0, notStarted: 0 };
  points.forEach(p => {
    const highLiteracy = p.x >= 50;
    const highUsage = p.y >= 50;
    if (highLiteracy && highUsage) counts.promoter++;
    else if (highLiteracy && !highUsage) counts.knowledge++;
    else if (!highLiteracy && highUsage) counts.selfStyle++;
    else counts.notStarted++;
  });
  const total = points.length;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
  return { points, counts, total, pct };
}


function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs px-2 py-1 rounded-md border border-shin-accent hover:border-shin-blue text-shin-mid hover:text-shin-blue transition-colors whitespace-nowrap"
    >
      {copied ? "✓ コピー済" : label}
    </button>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [addForm, setAddForm] = useState({
    name: "", industry: "", employeeCount: "",
    foundingYearRange: "", annualRevenueRange: "", itInvestmentLevel: "",
    currentItTools: [] as string[], hasDxPerson: "", aiInitiativeStatus: "",
    isDemo: false,
  });
  const [showDemo, setShowDemo] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generateElapsed, setGenerateElapsed] = useState(0);
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
  useEffect(() => { setOrigin(window.location.origin); }, []);

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
        setAddForm({ name: "", industry: "", employeeCount: "", foundingYearRange: "", annualRevenueRange: "", itInvestmentLevel: "", currentItTools: [], hasDxPerson: "", aiInitiativeStatus: "", isDemo: false });
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
    setGenerateElapsed(0);
    const start = Date.now();
    const timer = setInterval(() => {
      setGenerateElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: selectedCompany, responses }),
      });
      const data = await res.json();
      setReport(data.report);
    } finally {
      clearInterval(timer);
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
    try {
      const parsed = JSON.parse(report);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        parsedReport = parsed;
      }
    } catch { parsedReport = null; }
  }

  return (
    <div className="min-h-screen bg-[#F5F8FC]">
      <header className="bg-shin-dark text-white px-6 py-4 flex justify-between items-center">
        <div>
          <p className="text-[#BCC8DE] text-xs" style={{ letterSpacing: "4px" }}>SHIN</p>
          <h1 className="text-lg font-bold">生成AI活用診断 管理画面</h1>
        </div>
        <button onClick={() => { sessionStorage.removeItem("admin_auth"); router.push("/admin"); }} className="text-[#BCC8DE] text-sm hover:text-white">ログアウト</button>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Add Company */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-shin-charcoal font-semibold mb-4">企業を追加</h2>
          <form onSubmit={handleAddCompany} className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <input required value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="企業名 *" className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[160px] focus:outline-none focus:border-shin-blue" />
              <input value={addForm.industry} onChange={e => setAddForm(p => ({ ...p, industry: e.target.value }))} placeholder="業種" className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[120px] focus:outline-none focus:border-shin-blue" />
              <input value={addForm.employeeCount} onChange={e => setAddForm(p => ({ ...p, employeeCount: e.target.value }))} placeholder="従業員数" className="border border-shin-accent rounded-lg px-4 py-2 w-32 focus:outline-none focus:border-shin-blue" />
            </div>
            <div className="flex flex-wrap gap-3">
              <select value={addForm.foundingYearRange} onChange={e => setAddForm(p => ({ ...p, foundingYearRange: e.target.value }))} className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[140px] focus:outline-none focus:border-shin-blue text-shin-charcoal">
                <option value="">設立年代</option>
                {["〜1990年代","2000年代","2010年代","2020年以降"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select value={addForm.annualRevenueRange} onChange={e => setAddForm(p => ({ ...p, annualRevenueRange: e.target.value }))} className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[140px] focus:outline-none focus:border-shin-blue text-shin-charcoal">
                <option value="">年商規模</option>
                {["1億円未満","1〜5億円","5〜10億円","10億円以上","非公開"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select value={addForm.itInvestmentLevel} onChange={e => setAddForm(p => ({ ...p, itInvestmentLevel: e.target.value }))} className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[180px] focus:outline-none focus:border-shin-blue text-shin-charcoal">
                <option value="">IT投資姿勢</option>
                {["積極的に投資している","必要に応じて導入している","コストを抑えたい","ほぼ投資していない"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select value={addForm.hasDxPerson} onChange={e => setAddForm(p => ({ ...p, hasDxPerson: e.target.value }))} className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[140px] focus:outline-none focus:border-shin-blue text-shin-charcoal">
                <option value="">DX担当者</option>
                {["専任担当者がいる","兼任でいる","いない"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select value={addForm.aiInitiativeStatus} onChange={e => setAddForm(p => ({ ...p, aiInitiativeStatus: e.target.value }))} className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[200px] focus:outline-none focus:border-shin-blue text-shin-charcoal">
                <option value="">AI導入状況</option>
                {["すでに組織的に活用中","試験的に導入している","個人レベルで使っている人がいる","まだ誰も使っていない"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <p className="text-shin-mid text-xs mb-2">現在使っているITツール（複数選択可）</p>
              <div className="flex flex-wrap gap-2">
                {["会計・財務ソフト","CRM・SFA","チャット・コミュニケーションツール","プロジェクト管理ツール","電子署名・文書管理","特にデジタル化していない"].map(tool => {
                  const checked = addForm.currentItTools.includes(tool);
                  return (
                    <button key={tool} type="button" onClick={() => setAddForm(p => ({ ...p, currentItTools: checked ? p.currentItTools.filter(t => t !== tool) : [...p.currentItTools, tool] }))}
                      className={`px-3 py-1 rounded-full text-xs border-2 transition-colors ${checked ? "bg-shin-blue text-white border-shin-blue" : "bg-white text-shin-charcoal border-shin-accent hover:border-shin-blue"}`}>
                      {tool}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm text-shin-mid cursor-pointer">
                <input type="checkbox" checked={addForm.isDemo} onChange={e => setAddForm(p => ({ ...p, isDemo: e.target.checked }))} className="accent-shin-blue" />
                デモ用データとして登録（本番データと区別されます）
              </label>
              <button type="submit" disabled={adding} className="bg-shin-blue text-white rounded-lg px-6 py-2 font-semibold disabled:opacity-50 hover:bg-shin-blue-dark transition-colors">{adding ? "作成中..." : "企業を追加"}</button>
            </div>
          </form>
        </div>

        {/* Company List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-shin-accent flex justify-between items-center">
            <h2 className="text-shin-charcoal font-semibold">登録企業一覧（{(showDemo ? companies : companies.filter(c => !c.isDemo)).length}社）</h2>
            <label className="flex items-center gap-2 text-sm text-shin-mid cursor-pointer">
              <input type="checkbox" checked={showDemo} onChange={e => setShowDemo(e.target.checked)} className="accent-shin-blue" />
              デモデータを表示
            </label>
          </div>
          {loading ? (
            <div className="p-8 text-center text-shin-mid">読み込み中...</div>
          ) : (showDemo ? companies : companies.filter(c => !c.isDemo)).length === 0 ? (
            <div className="p-8 text-center text-shin-mid">企業が登録されていません</div>
          ) : (
            <div className="divide-y divide-shin-accent">
              {(showDemo ? companies : companies.filter(c => !c.isDemo)).map(company => (
                <div key={company.id} className="px-6 py-4 flex items-center justify-between hover:bg-shin-blue-pale transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-shin-charcoal">{company.name}</p>
                      {company.isDemo && <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">DEMO</span>}
                    </div>
                    <p className="text-shin-mid text-sm">{company.industry} / {company.employeeCount}名</p>
                    <p className="text-shin-light text-xs">{new Date(company.createdAt).toLocaleDateString("ja-JP")} 登録</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="inline-block bg-shin-blue-light text-shin-blue-dark px-3 py-1 rounded-full text-sm font-bold tracking-wider">{company.code}</span>
                    <CopyButton text={`${origin}/survey/${company.code}`} label="アンケートURL" />
                    <CopyButton text={`${origin}/report/${company.code}`} label="レポートURL" />
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
              <div className="bg-shin-blue-pale rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-shin-charcoal mb-2">配布用URL</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-shin-mid mb-0.5">従業員アンケート</p>
                    <p className="text-xs font-mono text-shin-charcoal break-all">{origin}/survey/{selectedCompany.code}</p>
                  </div>
                  <CopyButton text={`${origin}/survey/${selectedCompany.code}`} label="コピー" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-shin-mid mb-0.5">企業向けレポート確認</p>
                    <p className="text-xs font-mono text-shin-charcoal break-all">{origin}/report/{selectedCompany.code}</p>
                  </div>
                  <CopyButton text={`${origin}/report/${selectedCompany.code}`} label="コピー" />
                </div>
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

              {responses.length > 0 && (() => {
                const { points, counts, pct } = computePositioning(responses);
                return (
                  <div>
                    <h4 className="font-semibold mb-1">AI活用ポジショニングマップ</h4>
                    <p className="text-shin-mid text-xs mb-3">縦軸：AIの活用頻度（実践度）／横軸：AIリテラシー（知識・スキル）。回答者ごとの現在地をプロットし、活用定着に向けた打ち手の方向性を確認できます。</p>
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="grid grid-cols-[20px_1fr] grid-rows-[1fr_20px] gap-2 w-full max-w-sm">
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
                            <div key={i} className="absolute w-3 h-3 rounded-full bg-shin-blue border-2 border-white shadow" style={{ left: `calc(${p.x}% - 6px)`, top: `calc(${100 - p.y}% - 6px)` }} />
                          ))}
                        </div>
                        <div className="row-start-2 col-start-2 text-center text-xs text-shin-light">AIリテラシー 高 →</div>
                      </div>
                      <div className="flex-1 space-y-2 text-sm w-full">
                        <div className="flex justify-between items-center bg-green-50 rounded-lg px-3 py-2"><span className="font-semibold text-green-700">推進層（知識・実践とも高い）</span><span className="font-bold">{counts.promoter}名（{pct(counts.promoter)}%）</span></div>
                        <div className="flex justify-between items-center bg-blue-50 rounded-lg px-3 py-2"><span className="font-semibold text-blue-700">知識先行層（知識はあるが未実践）</span><span className="font-bold">{counts.knowledge}名（{pct(counts.knowledge)}%）</span></div>
                        <div className="flex justify-between items-center bg-yellow-50 rounded-lg px-3 py-2"><span className="font-semibold text-yellow-700">我流活用層（実践先行・知識不足）</span><span className="font-bold">{counts.selfStyle}名（{pct(counts.selfStyle)}%）</span></div>
                        <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2"><span className="font-semibold text-shin-mid">未着手層（知識・実践とも低い）</span><span className="font-bold">{counts.notStarted}名（{pct(counts.notStarted)}%）</span></div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                <button onClick={handleGenerateReport} disabled={generatingReport || responses.length === 0} className="bg-shin-blue text-white rounded-lg px-6 py-2.5 font-semibold disabled:opacity-50 hover:bg-shin-blue-dark transition-colors">
                  {generatingReport ? "生成中..." : "診断レポートを生成"}
                </button>
                {responses.length === 0 && <p className="text-shin-mid text-sm">回答データがない場合は生成できません</p>}
                {generatingReport && (
                  <div className="bg-shin-blue-pale border border-shin-blue rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-4 h-4 border-2 border-shin-blue border-t-transparent rounded-full animate-spin shrink-0" />
                      <p className="text-shin-charcoal font-semibold text-sm">AIがレポートを生成しています</p>
                      <span className="ml-auto text-shin-blue font-mono font-bold text-sm">{generateElapsed}秒</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-1.5 mb-3 overflow-hidden">
                      <div
                        className="h-1.5 bg-shin-blue rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(95, (generateElapsed / 60) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-shin-mid space-y-1">
                      <p className={generateElapsed >= 0 ? "text-shin-charcoal" : ""}>
                        {generateElapsed < 10 && "📋 回答データを解析中..."}
                        {generateElapsed >= 10 && generateElapsed < 25 && "🔍 AIリテラシーマップを作成中..."}
                        {generateElapsed >= 25 && generateElapsed < 40 && "💡 AI活用機会を特定中..."}
                        {generateElapsed >= 40 && generateElapsed < 55 && "🗺 ロードマップを設計中..."}
                        {generateElapsed >= 55 && "✍️ レポートを仕上げ中..."}
                      </p>
                      <p className="text-shin-light">目安：約60〜90秒（回答数{responses.length}件）</p>
                    </div>
                  </div>
                )}
              </div>

              {parsedReport && (
                <div className="border-t border-shin-accent pt-6">
                  <DiagnosticReportView
                    report={parsedReport as Record<string, unknown>}
                    companyName={selectedCompany.name}
                    responseCount={responses.length}
                  />
                  <details className="text-xs text-shin-light mt-4">
                    <summary className="cursor-pointer">生データ（JSON）を表示</summary>
                    <pre className="mt-2 bg-gray-100 rounded p-3 overflow-x-auto text-xs">{JSON.stringify(parsedReport, null, 2)}</pre>
                  </details>
                </div>
              )}
              {report && !parsedReport && (
                <div className="border-t border-shin-accent pt-6">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3">
                    <p className="text-red-700 font-semibold text-sm mb-1">⚠️ レポートの解析に失敗しました</p>
                    <p className="text-red-600 text-xs">AIの応答をJSONとして読み取れませんでした。再度「診断レポートを生成」を試してください。</p>
                  </div>
                  <details className="text-xs text-shin-light">
                    <summary className="cursor-pointer">AIの生応答を表示（デバッグ用）</summary>
                    <pre className="mt-2 bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">{report}</pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
