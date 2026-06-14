"use client";
import { useState, useEffect, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Company } from "@/lib/types";
import { SURVEY_SECTIONS, LITERACY_TEST } from "@/lib/survey-data";

interface ResponseData {
  testScore: number;
  basic: Record<string, string>;
  chapterScores: Record<string, { score: number; max: number; rate: number }>;
  submittedAt: string;
  surveyAnswers: Record<string, string | string[]>;
  testAnswers?: Record<number, number>;
}

function usageScore(r: ResponseData): number {
  const ans = r.surveyAnswers?.["Q7-2"] as string | undefined;
  if (ans === "業務で日常的に使っている") return 85;
  if (ans === "試したことはある（業務以外含む）") return 50;
  return 15;
}

// Percentile rank (0-100) for each value, tied values share the average rank
function percentileRanks(values: number[]): number[] {
  const n = values.length;
  if (n <= 1) return values.map(() => 50);
  const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(n).fill(0);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && sorted[j + 1].v === sorted[i].v) j++;
    const avgRank = (i + j) / 2;
    for (let k = i; k <= j; k++) ranks[sorted[k].i] = avgRank;
    i = j + 1;
  }
  return ranks.map(r => (r / (n - 1)) * 100);
}

function computePositioning(responses: ResponseData[]) {
  const literacyRanks = percentileRanks(responses.map(r => r.testScore));
  const usageRanks = percentileRanks(responses.map(r => usageScore(r)));
  const points = responses.map((_, i) => ({ x: literacyRanks[i], y: usageRanks[i] }));
  const counts = { promoter: 0, knowledge: 0, selfStyle: 0, notStarted: 0 };
  const quadrants = points.map(p => {
    const highLiteracy = p.x >= 50;
    const highUsage = p.y >= 50;
    if (highLiteracy && highUsage) { counts.promoter++; return "promoter" as const; }
    if (highLiteracy && !highUsage) { counts.knowledge++; return "knowledge" as const; }
    if (!highLiteracy && highUsage) { counts.selfStyle++; return "selfStyle" as const; }
    counts.notStarted++; return "notStarted" as const;
  });
  const total = points.length;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
  return { points, counts, quadrants, total, pct };
}

const QUADRANT_INFO = {
  promoter: { label: "推進層", badge: "bg-green-100 text-green-700" },
  knowledge: { label: "知識先行層", badge: "bg-blue-100 text-blue-700" },
  selfStyle: { label: "我流活用層", badge: "bg-yellow-100 text-yellow-700" },
  notStarted: { label: "未着手層", badge: "bg-gray-100 text-shin-mid" },
} as const;

type QuadrantKey = keyof typeof QUADRANT_INFO;

// Why this respondent ended up in this quadrant, based on their inputs
function explainPosition(r: ResponseData, quadrant: QuadrantKey): string {
  const usage = (r.surveyAnswers?.["Q7-2"] as string) || "未回答";
  const chapters = Object.entries(r.chapterScores || {}).filter(([, v]) => v && v.max > 0);
  let chapterNote = "";
  if (chapters.length > 0) {
    const sorted = [...chapters].sort((a, b) => b[1].rate - a[1].rate);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    if (strongest[0] !== weakest[0]) {
      chapterNote = `クイズでは「${strongest[0]}」分野の正答率が高く（${Math.round(strongest[1].rate * 100)}%）、「${weakest[0]}」分野が弱点（${Math.round(weakest[1].rate * 100)}%）です。`;
    } else {
      chapterNote = `クイズは全分野でほぼ同程度の正答率（約${Math.round(strongest[1].rate * 100)}%）でした。`;
    }
  }

  switch (quadrant) {
    case "promoter":
      return `リテラシースコアが社内上位かつ、AIを「${usage}」と回答しており、知識と実践の両方が伴っています。${chapterNote}今後は周囲への展開役（推進役）を担える人材です。`;
    case "knowledge":
      return `リテラシースコアは社内上位ですが、AI利用は「${usage}」と回答しており、知識を実践に結びつけられていません。${chapterNote}業務での具体的な活用シーンを提示することで、知識先行層から推進層への移行が期待できます。`;
    case "selfStyle":
      return `AI利用は「${usage}」と回答し活用頻度は社内上位ですが、リテラシースコアは社内では低めです。${chapterNote}実践は先行しているものの、出力の評価（Discernment）やリスク管理（Diligence）の理解が不足していると、誤った使い方が定着するリスクがあります。`;
    case "notStarted":
    default:
      return `リテラシースコア・AI利用頻度（「${usage}」）ともに社内では低めです。${chapterNote}まずは基礎研修などで「触れる」機会を作ることが最初のステップになります。`;
  }
}

// "1〜2ヶ月" -> [1,2], "6ヶ月〜" -> [6,12], "3ヶ月" -> [0,3]
function parseDuration(duration: string): [number, number] {
  const nums = (duration.match(/\d+/g) || []).map(Number);
  if (nums.length >= 2) return [nums[0], nums[1]];
  if (nums.length === 1) {
    if (duration.includes("〜") && duration.trim().endsWith("〜")) return [nums[0], nums[0] + 6];
    return [0, nums[0]];
  }
  return [0, 1];
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
    annualRevenueRange: "", itInvestmentLevel: "",
    currentItTools: [] as string[], hasDxPerson: "", aiInitiativeStatus: "",
    isDemo: false,
  });
  const [showDemo, setShowDemo] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", industry: "", employeeCount: "",
    annualRevenueRange: "", itInvestmentLevel: "",
    currentItTools: [] as string[], hasDxPerson: "", aiInitiativeStatus: "",
    isDemo: false,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [expandedRespondent, setExpandedRespondent] = useState<number | null>(null);
  const [showIntro, setShowIntro] = useState(false);

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
        setAddForm({ name: "", industry: "", employeeCount: "", annualRevenueRange: "", itInvestmentLevel: "", currentItTools: [], hasDxPerson: "", aiInitiativeStatus: "", isDemo: false });
        fetchCompanies();
      }
    } finally {
      setAdding(false);
    }
  }

  function handleStartEdit(company: Company) {
    setEditingCompany(company);
    setEditForm({
      name: company.name,
      industry: company.industry,
      employeeCount: company.employeeCount,
      annualRevenueRange: company.annualRevenueRange || "",
      itInvestmentLevel: company.itInvestmentLevel || "",
      currentItTools: company.currentItTools || [],
      hasDxPerson: company.hasDxPerson || "",
      aiInitiativeStatus: company.aiInitiativeStatus || "",
      isDemo: company.isDemo,
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCompany) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/companies/${editingCompany.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingCompany(null);
        fetchCompanies();
      }
    } finally {
      setSavingEdit(false);
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

  // 他社比較用に集計サマリーをマスターシートへ保存
  useEffect(() => {
    if (!selectedCompany || responses.length === 0) return;
    const { counts, total, pct } = computePositioning(responses);
    const avgTestScore = responses.reduce((s, r) => s + r.testScore, 0) / total;
    const avgUsageScore = responses.reduce((s, r) => s + usageScore(r), 0) / total;
    fetch(`/api/companies/${selectedCompany.id}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responseCount: total,
        avgTestScore: Math.round(avgTestScore * 10) / 10,
        avgUsageScore: Math.round(avgUsageScore * 10) / 10,
        promoterPct: pct(counts.promoter),
        knowledgePct: pct(counts.knowledge),
        selfStylePct: pct(counts.selfStyle),
        notStartedPct: pct(counts.notStarted),
      }),
    }).then(() => fetchCompanies()).catch(() => {});
  }, [selectedCompany, responses, fetchCompanies]);

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
          <p className="text-[#BCC8DE] text-xs" style={{ letterSpacing: "4px" }}>SHIN</p>
          <h1 className="text-lg font-bold">生成AI活用診断 管理画面</h1>
        </div>
        <button onClick={() => { sessionStorage.removeItem("admin_auth"); router.push("/admin"); }} className="text-[#BCC8DE] text-sm hover:text-white">ログアウト</button>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Getting Started */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button onClick={() => setShowIntro(v => !v)} className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-shin-blue-pale transition-colors">
            <div>
              <h2 className="text-shin-charcoal font-semibold">はじめに：この診断でわかること</h2>
              <p className="text-shin-mid text-xs mt-0.5">管理画面でできること、診断結果の見方をまとめています</p>
            </div>
            <span className="text-shin-mid text-xl">{showIntro ? "▲" : "▼"}</span>
          </button>
          {showIntro && (
            <div className="px-6 pb-6 space-y-5 text-sm border-t border-shin-accent pt-4">
              <div>
                <p className="font-semibold text-shin-charcoal mb-1">1. AI活用ポジショニングマップ（現在地の可視化）</p>
                <p className="text-shin-mid text-xs leading-relaxed">
                  各従業員の「AIリテラシー（クイズスコア）」×「AI活用頻度（Q7-2）」を社内の相対順位で4象限にプロットします。
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  <div className="bg-green-50 rounded-lg p-2 text-xs"><span className="font-semibold text-green-700">推進層</span><p className="text-shin-mid mt-0.5">知識・実践ともに高い。推進役の候補。</p></div>
                  <div className="bg-blue-50 rounded-lg p-2 text-xs"><span className="font-semibold text-blue-700">知識先行層</span><p className="text-shin-mid mt-0.5">知識はあるが実践が進んでいない。</p></div>
                  <div className="bg-yellow-50 rounded-lg p-2 text-xs"><span className="font-semibold text-yellow-700">我流活用層</span><p className="text-shin-mid mt-0.5">実践は先行しているが知識が不足。</p></div>
                  <div className="bg-gray-50 rounded-lg p-2 text-xs"><span className="font-semibold text-shin-mid">未着手層</span><p className="text-shin-mid mt-0.5">知識・実践ともにこれから。</p></div>
                </div>
                <p className="text-shin-light text-xs mt-2">企業詳細画面の「回答を見る」から、各回答者がなぜそのポジションになったかの理由・全設問の回答・クイズの正誤を個別に確認できます。</p>
              </div>
              <div>
                <p className="font-semibold text-shin-charcoal mb-1">2. 診断レポート（AI活用機会の整理）</p>
                <p className="text-shin-mid text-xs leading-relaxed mb-2">
                  「診断レポートを生成」ボタンを押すと、回答データをもとにAIが以下を整理します。
                </p>
                <ul className="text-shin-mid text-xs space-y-1 list-disc pl-4">
                  <li><span className="font-semibold text-shin-charcoal">エグゼクティブサマリー / Key Insight</span>：現状の総括と最も重要な気づき</li>
                  <li><span className="font-semibold text-green-700">Quick Win</span>：すぐにAI化できる定型業務とその効果</li>
                  <li><span className="font-semibold text-blue-700">Human-in-the-Loop</span>：AIを使いつつ人の確認が必要な業務</li>
                  <li><span className="font-semibold text-shin-mid">Not Recommended</span>：現時点でAI化を推奨しない業務</li>
                  <li><span className="font-semibold text-shin-charcoal">推進候補者（Promoter Candidates）</span>：社内で活用を広める役割に適した人材</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-shin-charcoal mb-1">3. 実行ロードマップ（次の一手）</p>
                <p className="text-shin-mid text-xs leading-relaxed">
                  ポジショニングマップの分布をもとに、Phase 1〜3のガントチャートと「現状 → 各フェーズ完了後」の変化イメージを表示します。各フェーズにはSHINの提供サービス（研修・コンサルティング・受託開発）が紐付き、提案へそのままつなげられます。
                </p>
              </div>
              <div className="bg-shin-blue-pale rounded-xl p-3 text-xs text-shin-charcoal">
                <span className="font-semibold">使い方の流れ：</span> ① 企業を追加 → ② アンケートURLを配布 → ③ 回答が集まったら「詳細」を開く → ④ ポジショニングマップ・個別回答を確認 → ⑤ 診断レポートを生成してロードマップを確認
              </div>
            </div>
          )}
        </div>

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
                    <button onClick={() => handleStartEdit(company)} className="border border-shin-accent text-shin-charcoal rounded-lg px-4 py-1.5 text-sm font-semibold hover:border-shin-blue hover:text-shin-blue transition-colors">編集</button>
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
                const { points, counts, quadrants, pct } = computePositioning(responses);
                return (
                  <div>
                    <h4 className="font-semibold mb-1">AI活用ポジショニングマップ</h4>
                    <p className="text-shin-mid text-xs mb-3">縦軸：AIの活用頻度（実践度）／横軸：AIリテラシー（知識・スキル）。各回答者の社内での相対的な順位に基づき現在地をプロットし、活用定着に向けた打ち手の方向性を確認できます。</p>
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="grid grid-cols-[20px_1fr] grid-rows-[1fr_20px] gap-2 w-full max-w-sm">
                        <div className="row-start-1 col-start-1 flex items-center justify-center">
                          <span className="-rotate-90 whitespace-nowrap text-xs text-shin-light">活用頻度 高 ↑（社内相対）</span>
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
                        <div className="row-start-2 col-start-2 text-center text-xs text-shin-light">AIリテラシー 高 →（社内相対）</div>
                      </div>
                      <div className="flex-1 space-y-2 text-sm w-full">
                        <div className="flex justify-between items-center bg-green-50 rounded-lg px-3 py-2"><span className="font-semibold text-green-700">推進層（知識・実践とも高い）</span><span className="font-bold">{counts.promoter}名（{pct(counts.promoter)}%）</span></div>
                        <div className="flex justify-between items-center bg-blue-50 rounded-lg px-3 py-2"><span className="font-semibold text-blue-700">知識先行層（知識はあるが未実践）</span><span className="font-bold">{counts.knowledge}名（{pct(counts.knowledge)}%）</span></div>
                        <div className="flex justify-between items-center bg-yellow-50 rounded-lg px-3 py-2"><span className="font-semibold text-yellow-700">我流活用層（実践先行・知識不足）</span><span className="font-bold">{counts.selfStyle}名（{pct(counts.selfStyle)}%）</span></div>
                        <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2"><span className="font-semibold text-shin-mid">未着手層（知識・実践とも低い）</span><span className="font-bold">{counts.notStarted}名（{pct(counts.notStarted)}%）</span></div>
                      </div>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-shin-blue-pale"><th className="px-3 py-2 text-left">年代</th><th className="px-3 py-2 text-left">職種</th><th className="px-3 py-2 text-center">リテラシースコア</th><th className="px-3 py-2 text-left">AI利用状況</th><th className="px-3 py-2 text-left">分類</th><th className="px-3 py-2 text-center">詳細</th></tr></thead>
                        <tbody>{responses.map((r, i) => {
                          const q = QUADRANT_INFO[quadrants[i]];
                          const expanded = expandedRespondent === i;
                          return (
                            <Fragment key={i}>
                              <tr className="border-b border-shin-accent">
                                <td className="px-3 py-2">{r.basic?.["Q0-1"] || "-"}</td>
                                <td className="px-3 py-2">{r.basic?.["Q0-2"] || "-"}</td>
                                <td className="px-3 py-2 text-center font-bold">{r.testScore}/20</td>
                                <td className="px-3 py-2">{(r.surveyAnswers?.["Q7-2"] as string) || "-"}</td>
                                <td className="px-3 py-2"><span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${q.badge}`}>{q.label}</span></td>
                                <td className="px-3 py-2 text-center">
                                  <button onClick={() => setExpandedRespondent(expanded ? null : i)} className="text-xs text-shin-blue hover:underline whitespace-nowrap">
                                    {expanded ? "閉じる ▲" : "回答を見る ▼"}
                                  </button>
                                </td>
                              </tr>
                              {expanded && (
                                <tr className="border-b border-shin-accent bg-shin-blue-pale/40">
                                  <td colSpan={6} className="px-3 py-4">
                                    <div className="space-y-4">
                                      <div className="bg-white border border-shin-accent rounded-xl p-3">
                                        <p className="text-xs font-semibold text-shin-charcoal mb-1">この回答者が「{q.label}」と判定された理由</p>
                                        <p className="text-xs text-shin-mid leading-relaxed">{explainPosition(r, quadrants[i])}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-shin-charcoal mb-2">アンケート回答内容</p>
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                          {SURVEY_SECTIONS.flatMap(section => section.questions).map(qn => {
                                            const ans = r.surveyAnswers?.[qn.id] ?? r.basic?.[qn.id];
                                            if (ans === undefined) return null;
                                            const ansText = Array.isArray(ans) ? (ans.length > 0 ? ans.join("、") : "（未回答）") : (ans || "（未回答）");
                                            return (
                                              <div key={qn.id} className="text-xs border-b border-shin-accent/60 pb-1">
                                                <p className="text-shin-mid">{qn.text}</p>
                                                <p className="text-shin-charcoal font-medium">{ansText}</p>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-shin-charcoal mb-2">リテラシークイズの回答（{r.testScore}/20）</p>
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                          {LITERACY_TEST.map((tq, ti) => {
                                            const picked = r.testAnswers?.[ti];
                                            const correct = picked === tq.correctIndex;
                                            return (
                                              <div key={ti} className="text-xs border-b border-shin-accent/60 pb-1">
                                                <p className="text-shin-mid">
                                                  <span className="inline-block bg-gray-100 text-shin-mid rounded px-1.5 py-0.5 mr-1 text-[10px]">{tq.chapter}</span>
                                                  {tq.question}
                                                </p>
                                                <p className={correct ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
                                                  {correct ? "✓ " : "✗ "}
                                                  回答: {picked !== undefined ? tq.options[picked] ?? "（不明）" : "（未回答）"}
                                                  {!correct && <span className="text-shin-mid font-normal"> ／ 正解: {tq.options[tq.correctIndex]}</span>}
                                                </p>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {responses.length > 0 && (() => {
                const others = companies.filter(c => !c.isDemo && c.id !== selectedCompany.id && (c.responseCount || 0) > 0);
                if (others.length === 0) {
                  return (
                    <div className="bg-gray-50 rounded-xl p-4 text-xs text-shin-mid">
                      他社比較（ベンチマーク）：他社の診断データが蓄積されると、ここに業界内での相対比較が表示されます。
                    </div>
                  );
                }
                const { counts, total, pct } = computePositioning(responses);
                const thisAvgTestScore = responses.reduce((s, r) => s + r.testScore, 0) / total;
                const thisAvgUsageScore = responses.reduce((s, r) => s + usageScore(r), 0) / total;
                const avgOf = (key: "avgTestScore" | "avgUsageScore" | "promoterPct" | "knowledgePct" | "selfStylePct" | "notStartedPct") =>
                  others.reduce((s, c) => s + (c[key] || 0), 0) / others.length;
                const rows: Array<{ label: string; mine: number; others: number; unit: string }> = [
                  { label: "リテラシースコア（平均）", mine: Math.round(thisAvgTestScore * 10) / 10, others: Math.round(avgOf("avgTestScore") * 10) / 10, unit: "/20" },
                  { label: "AI活用度スコア（平均）", mine: Math.round(thisAvgUsageScore * 10) / 10, others: Math.round(avgOf("avgUsageScore") * 10) / 10, unit: "/85" },
                  { label: "推進層比率", mine: pct(counts.promoter), others: Math.round(avgOf("promoterPct")), unit: "%" },
                  { label: "知識先行層比率", mine: pct(counts.knowledge), others: Math.round(avgOf("knowledgePct")), unit: "%" },
                  { label: "我流活用層比率", mine: pct(counts.selfStyle), others: Math.round(avgOf("selfStylePct")), unit: "%" },
                  { label: "未着手層比率", mine: pct(counts.notStarted), others: Math.round(avgOf("notStartedPct")), unit: "%" },
                ];
                return (
                  <div>
                    <h4 className="font-semibold mb-1">他社比較（ベンチマーク）</h4>
                    <p className="text-shin-mid text-xs mb-3">診断済みの他社（{others.length}社・デモ除く）の平均値と比較した、貴社の位置づけです。</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-shin-blue-pale"><th className="px-3 py-2 text-left">指標</th><th className="px-3 py-2 text-center">貴社</th><th className="px-3 py-2 text-center">他社平均</th><th className="px-3 py-2 text-center">差分</th></tr></thead>
                        <tbody>{rows.map(row => {
                          const diff = Math.round((row.mine - row.others) * 10) / 10;
                          const diffColor = diff > 0 ? "text-green-700" : diff < 0 ? "text-red-600" : "text-shin-mid";
                          return (
                            <tr key={row.label} className="border-b border-shin-accent">
                              <td className="px-3 py-2">{row.label}</td>
                              <td className="px-3 py-2 text-center font-bold">{row.mine}{row.unit}</td>
                              <td className="px-3 py-2 text-center text-shin-mid">{row.others}{row.unit}</td>
                              <td className={`px-3 py-2 text-center font-semibold ${diffColor}`}>{diff > 0 ? "+" : ""}{diff}{row.unit}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

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
                  {"roadmap" in parsedReport && Array.isArray(parsedReport.roadmap) && (() => {
                    const roadmap = parsedReport.roadmap as Array<{phase: number; title: string; duration: string; goals: string[]; actions: string[]; metrics: string[]; shinService: string}>;
                    const ranges = roadmap.map(p => parseDuration(p.duration));
                    const totalMonths = Math.max(12, ...ranges.map(([, e]) => e));
                    const barColors = ["bg-shin-blue", "bg-emerald-500", "bg-purple-500", "bg-orange-500"];
                    const positioning = computePositioning(responses);
                    const segments = [
                      { label: "推進層", pct: positioning.pct(positioning.counts.promoter) },
                      { label: "知識先行層", pct: positioning.pct(positioning.counts.knowledge) },
                      { label: "我流活用層", pct: positioning.pct(positioning.counts.selfStyle) },
                      { label: "未着手層", pct: positioning.pct(positioning.counts.notStarted) },
                    ];
                    const dominant = segments.reduce((a, b) => (b.pct > a.pct ? b : a));
                    return (
                      <div className="space-y-6">
                        <div>
                          <p className="font-semibold mb-3">実行ロードマップ（スケジュール）</p>
                          <div className="space-y-2">
                            {roadmap.map((phase, i) => {
                              const [start, end] = ranges[i];
                              return (
                                <div key={phase.phase} className="flex items-center gap-3">
                                  <div className="w-36 shrink-0 text-xs">
                                    <p className="font-semibold text-shin-charcoal">Phase {phase.phase}</p>
                                    <p className="text-shin-mid">{phase.title}</p>
                                  </div>
                                  <div className="flex-1 relative h-7 bg-gray-100 rounded-md">
                                    <div
                                      className={`absolute top-0 h-7 rounded-md ${barColors[i % barColors.length]}`}
                                      style={{ left: `${(start / totalMonths) * 100}%`, width: `${((end - start) / totalMonths) * 100}%` }}
                                    />
                                  </div>
                                  <div className="w-32 shrink-0 text-[10px] text-shin-mid">{phase.duration}・{phase.shinService}</div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-between text-[10px] text-shin-light mt-1 pl-[9.5rem] pr-32">
                            <span>0ヶ月</span>
                            <span>{totalMonths}ヶ月〜</span>
                          </div>
                        </div>

                        {responses.length > 0 && (
                          <div>
                            <p className="font-semibold mb-3">活用定着のステップ（Before → After）</p>
                            <div className="flex flex-col md:flex-row gap-2 items-stretch">
                              <div className="flex-1 border border-shin-accent rounded-xl p-3 bg-gray-50">
                                <p className="text-xs font-bold text-shin-mid mb-1">現状</p>
                                <p className="text-sm">{dominant.label}が中心（{dominant.pct}%）</p>
                                <p className="text-xs text-shin-mid mt-1">推進層 {positioning.pct(positioning.counts.promoter)}%</p>
                              </div>
                              {roadmap.map((phase, i) => (
                                <Fragment key={phase.phase}>
                                  <div className="flex items-center justify-center text-shin-light">→</div>
                                  <div className={`flex-1 border rounded-xl p-3 ${i === roadmap.length - 1 ? "border-shin-blue bg-shin-blue-pale" : "border-shin-accent"}`}>
                                    <p className="text-xs font-bold text-shin-blue mb-1">Phase {phase.phase} 完了後</p>
                                    <ul className="text-sm space-y-1">
                                      {phase.goals.map((g, gi) => <li key={gi}>・{g}</li>)}
                                    </ul>
                                  </div>
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="font-semibold mb-3">フェーズ詳細</p>
                          <div className="space-y-3">
                            {roadmap.map((phase) => (
                              <div key={phase.phase} className="border border-shin-accent rounded-xl p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="font-semibold">Phase {phase.phase}: {phase.title}</p>
                                  <div className="flex gap-2">
                                    <span className="bg-shin-blue-light text-shin-blue-dark text-xs px-2 py-1 rounded-full">{phase.duration}</span>
                                    <span className="bg-gray-100 text-shin-mid text-xs px-2 py-1 rounded-full">{phase.shinService}</span>
                                  </div>
                                </div>
                                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs font-semibold text-shin-mid mb-1">ゴール</p>
                                    <ul className="text-shin-mid space-y-1">{phase.goals?.map((g, i) => <li key={i}>• {g}</li>)}</ul>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-shin-mid mb-1">アクション</p>
                                    <ul className="text-shin-mid space-y-1">{phase.actions?.map((a, i) => <li key={i}>• {a}</li>)}</ul>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-shin-mid mb-1">指標</p>
                                    <ul className="text-shin-mid space-y-1">{phase.metrics?.map((m, i) => <li key={i}>• {m}</li>)}</ul>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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

      {/* Edit Modal */}
      {editingCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-shin-accent flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-shin-charcoal text-lg">{editingCompany.name} を編集</h3>
              <button onClick={() => setEditingCompany(null)} className="text-shin-mid hover:text-shin-charcoal text-2xl">×</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="flex flex-wrap gap-3">
                <input required value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="企業名 *" className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[160px] focus:outline-none focus:border-shin-blue" />
                <input value={editForm.industry} onChange={e => setEditForm(p => ({ ...p, industry: e.target.value }))} placeholder="業種" className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[120px] focus:outline-none focus:border-shin-blue" />
                <input value={editForm.employeeCount} onChange={e => setEditForm(p => ({ ...p, employeeCount: e.target.value }))} placeholder="従業員数" className="border border-shin-accent rounded-lg px-4 py-2 w-32 focus:outline-none focus:border-shin-blue" />
              </div>
              <div className="flex flex-wrap gap-3">
                <select value={editForm.annualRevenueRange} onChange={e => setEditForm(p => ({ ...p, annualRevenueRange: e.target.value }))} className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[140px] focus:outline-none focus:border-shin-blue text-shin-charcoal">
                  <option value="">年商規模</option>
                  {["1億円未満","1〜5億円","5〜10億円","10億円以上","非公開"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <select value={editForm.itInvestmentLevel} onChange={e => setEditForm(p => ({ ...p, itInvestmentLevel: e.target.value }))} className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[180px] focus:outline-none focus:border-shin-blue text-shin-charcoal">
                  <option value="">IT投資姿勢</option>
                  {["積極的に投資している","必要に応じて導入している","コストを抑えたい","ほぼ投資していない"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <select value={editForm.hasDxPerson} onChange={e => setEditForm(p => ({ ...p, hasDxPerson: e.target.value }))} className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[140px] focus:outline-none focus:border-shin-blue text-shin-charcoal">
                  <option value="">DX担当者</option>
                  {["専任担当者がいる","兼任でいる","いない"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <select value={editForm.aiInitiativeStatus} onChange={e => setEditForm(p => ({ ...p, aiInitiativeStatus: e.target.value }))} className="border border-shin-accent rounded-lg px-4 py-2 flex-1 min-w-[200px] focus:outline-none focus:border-shin-blue text-shin-charcoal">
                  <option value="">AI導入状況</option>
                  {["すでに組織的に活用中","試験的に導入している","個人レベルで使っている人がいる","まだ誰も使っていない"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <p className="text-shin-mid text-xs mb-2">現在使っているITツール（複数選択可）</p>
                <div className="flex flex-wrap gap-2">
                  {["会計・財務ソフト","CRM・SFA","チャット・コミュニケーションツール","プロジェクト管理ツール","電子署名・文書管理","特にデジタル化していない"].map(tool => {
                    const checked = editForm.currentItTools.includes(tool);
                    return (
                      <button key={tool} type="button" onClick={() => setEditForm(p => ({ ...p, currentItTools: checked ? p.currentItTools.filter(t => t !== tool) : [...p.currentItTools, tool] }))}
                        className={`px-3 py-1 rounded-full text-xs border-2 transition-colors ${checked ? "bg-shin-blue text-white border-shin-blue" : "bg-white text-shin-charcoal border-shin-accent hover:border-shin-blue"}`}>
                        {tool}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 text-sm text-shin-mid cursor-pointer">
                  <input type="checkbox" checked={editForm.isDemo} onChange={e => setEditForm(p => ({ ...p, isDemo: e.target.checked }))} className="accent-shin-blue" />
                  デモ用データとして登録（本番データと区別されます）
                </label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditingCompany(null)} className="border border-shin-accent text-shin-charcoal rounded-lg px-6 py-2 font-semibold hover:border-shin-blue transition-colors">キャンセル</button>
                  <button type="submit" disabled={savingEdit} className="bg-shin-blue text-white rounded-lg px-6 py-2 font-semibold disabled:opacity-50 hover:bg-shin-blue-dark transition-colors">{savingEdit ? "保存中..." : "保存"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
