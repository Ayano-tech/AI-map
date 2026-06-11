"use client";
import { Fragment } from "react";

interface AIOpportunity {
  task: string;
  currentState?: string;
  aiProposal: string;
  estimatedImpact: string;
}

interface RoadmapPhase {
  phase: number;
  title: string;
  duration: string;
  goals: string[];
  actions: string[];
  metrics: string[];
  shinService: string;
}

interface ReportData {
  executiveSummary?: string;
  keyInsight?: string;
  literacyMap?: {
    averageScore?: number;
    organizationStrength?: string;
    organizationWeakness?: string;
    byAge?: Record<string, Record<string, number>>;
  };
  workflowDiagnosis?: {
    highImpactAreas?: string[];
    bottleneckSummary?: string;
    roiPotentialScore?: number;
  };
  aiOpportunities?: {
    quickWins?: AIOpportunity[];
    humanInLoop?: AIOpportunity[];
    notRecommended?: AIOpportunity[];
  };
  promoterCandidates?: Array<{ respondentIndex: number; score: number; reason: string }>;
  roadmap?: RoadmapPhase[];
}

function parseDuration(duration: string): [number, number] {
  const nums = (duration.match(/\d+/g) || []).map(Number);
  if (nums.length >= 2) return [nums[0], nums[1]];
  if (nums.length === 1) {
    if (duration.includes("〜") && duration.trim().endsWith("〜")) return [nums[0], nums[0] + 6];
    return [0, nums[0]];
  }
  return [0, 1];
}

export default function DiagnosticReportView({
  report,
  companyName,
  responseCount,
}: {
  report: ReportData;
  companyName: string;
  responseCount: number;
}) {
  const barColors = ["bg-shin-blue", "bg-emerald-500", "bg-purple-500", "bg-orange-500"];
  const roadmap = report.roadmap || [];
  const ranges = roadmap.map((p) => parseDuration(p.duration));
  const totalMonths = Math.max(12, ...ranges.map(([, e]) => e));

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      {/* Print button - hidden in print */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-shin-charcoal text-white rounded-lg px-5 py-2.5 font-semibold hover:bg-black transition-colors text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
            <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/>
          </svg>
          PDFで保存
        </button>
      </div>

      {/* Report content */}
      <div id="diagnostic-report" className="space-y-6 print:space-y-4">

        {/* Cover */}
        <div className="bg-shin-dark text-white rounded-xl p-6 print:rounded-none print:p-4">
          <p className="text-[#BCC8DE] text-xs tracking-[3px] mb-1">POWERED BY SHIN</p>
          <h1 className="text-2xl font-bold mb-1">生成AI活用診断レポート</h1>
          <p className="text-[#BCC8DE] text-sm">{companyName}　／　回答者数：{responseCount}名　／　生成日：{new Date().toLocaleDateString("ja-JP")}</p>
        </div>

        {/* Executive Summary */}
        {report.executiveSummary && (
          <div className="bg-shin-blue-pale border-l-4 border-shin-blue rounded-xl p-5">
            <p className="text-xs font-bold text-shin-blue mb-2 tracking-wider">EXECUTIVE SUMMARY</p>
            <p className="text-shin-charcoal leading-relaxed">{report.executiveSummary}</p>
          </div>
        )}

        {/* Key Insight */}
        {report.keyInsight && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex gap-3">
            <span className="text-2xl shrink-0">💡</span>
            <div>
              <p className="text-xs font-bold text-yellow-800 mb-1">KEY INSIGHT</p>
              <p className="text-yellow-900 font-medium">{report.keyInsight}</p>
            </div>
          </div>
        )}

        {/* Literacy Map */}
        {report.literacyMap && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-shin-charcoal text-base mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-shin-blue text-white text-xs flex items-center justify-center font-bold">1</span>
              AIリテラシーマップ
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {report.literacyMap.averageScore !== undefined && (
                <div className="bg-shin-blue-pale rounded-xl p-4 text-center">
                  <p className="text-xs text-shin-mid mb-1">組織平均スコア</p>
                  <p className="text-4xl font-bold text-shin-blue">{report.literacyMap.averageScore}<span className="text-base font-normal text-shin-mid"> / 5</span></p>
                </div>
              )}
              {report.literacyMap.byAge && Object.keys(report.literacyMap.byAge).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(report.literacyMap.byAge).map(([age, scores]) => (
                    <div key={age} className="flex items-center gap-2 text-sm">
                      <span className="w-12 shrink-0 text-shin-mid text-xs">{age}</span>
                      <div className="flex-1 grid grid-cols-4 gap-1">
                        {["delegation","description","discernment","diligence"].map(k => (
                          <div key={k} className="text-center">
                            <div className="h-1.5 rounded-full bg-shin-blue-light overflow-hidden">
                              <div className="h-full bg-shin-blue rounded-full" style={{ width: `${(scores[k] || 0) / 5 * 100}%` }} />
                            </div>
                            <p className="text-[9px] text-shin-light mt-0.5">{k.slice(0,3)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {report.literacyMap.organizationStrength && (
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-green-700 mb-1">✓ 組織の強み</p>
                  <p className="text-shin-charcoal text-sm">{report.literacyMap.organizationStrength}</p>
                </div>
              )}
              {report.literacyMap.organizationWeakness && (
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-orange-700 mb-1">△ 研修テーマ</p>
                  <p className="text-shin-charcoal text-sm">{report.literacyMap.organizationWeakness}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workflow Diagnosis */}
        {report.workflowDiagnosis && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-shin-charcoal text-base mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-shin-blue text-white text-xs flex items-center justify-center font-bold">2</span>
              業務実態診断
            </h2>
            {report.workflowDiagnosis.bottleneckSummary && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-xs font-semibold text-red-700 mb-1">ボトルネックサマリー</p>
                <p className="text-shin-charcoal text-sm">{report.workflowDiagnosis.bottleneckSummary}</p>
              </div>
            )}
            {report.workflowDiagnosis.highImpactAreas && report.workflowDiagnosis.highImpactAreas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-shin-mid mb-2">AI導入ROIが高い領域</p>
                <div className="space-y-2">
                  {report.workflowDiagnosis.highImpactAreas.map((area, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-shin-blue text-white text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                      <p className="text-shin-charcoal">{area}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {report.workflowDiagnosis.roiPotentialScore !== undefined && report.workflowDiagnosis.roiPotentialScore > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <p className="text-xs text-shin-mid">ROIポテンシャルスコア</p>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, report.workflowDiagnosis.roiPotentialScore)}%` }} />
                </div>
                <p className="text-sm font-bold text-emerald-600">{report.workflowDiagnosis.roiPotentialScore}</p>
              </div>
            )}
          </div>
        )}

        {/* AI Opportunities */}
        {report.aiOpportunities && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-shin-charcoal text-base mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-shin-blue text-white text-xs flex items-center justify-center font-bold">3</span>
              AI活用機会マップ
            </h2>
            <div className="space-y-4">
              {report.aiOpportunities.quickWins && report.aiOpportunities.quickWins.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Quick Win</span>
                    <span className="text-xs text-shin-mid">すぐに着手できる即効施策</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {report.aiOpportunities.quickWins.map((item, i) => (
                      <div key={i} className="bg-green-50 rounded-xl p-3 text-sm border border-green-100">
                        <p className="font-semibold text-shin-charcoal mb-1">{item.task}</p>
                        <p className="text-shin-mid text-xs mb-1">{item.aiProposal}</p>
                        <p className="text-green-700 text-xs font-medium">効果：{item.estimatedImpact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {report.aiOpportunities.humanInLoop && report.aiOpportunities.humanInLoop.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">Human-in-the-Loop</span>
                    <span className="text-xs text-shin-mid">人間の判断をAIが補助</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {report.aiOpportunities.humanInLoop.map((item, i) => (
                      <div key={i} className="bg-blue-50 rounded-xl p-3 text-sm border border-blue-100">
                        <p className="font-semibold text-shin-charcoal mb-1">{item.task}</p>
                        <p className="text-shin-mid text-xs mb-1">{item.aiProposal}</p>
                        <p className="text-blue-700 text-xs font-medium">効果：{item.estimatedImpact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Promoter Candidates */}
        {report.promoterCandidates && report.promoterCandidates.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-shin-charcoal text-base mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-shin-blue text-white text-xs flex items-center justify-center font-bold">4</span>
              AI推進者候補
            </h2>
            <div className="space-y-2">
              {report.promoterCandidates.map((p, i) => (
                <div key={i} className="flex items-start gap-3 bg-shin-blue-pale rounded-xl p-3 text-sm">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-shin-blue text-white text-xs flex items-center justify-center font-bold">No.{p.respondentIndex + 1}</span>
                  <div className="flex-1">
                    <p className="text-shin-charcoal">{p.reason}</p>
                  </div>
                  <span className="shrink-0 font-bold text-shin-blue">{p.score}<span className="text-shin-mid font-normal text-xs">/5</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roadmap */}
        {roadmap.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-shin-charcoal text-base mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-shin-blue text-white text-xs flex items-center justify-center font-bold">5</span>
              実行ロードマップ
            </h2>

            {/* Gantt */}
            <div className="space-y-2 mb-6">
              {roadmap.map((phase, i) => {
                const [start, end] = ranges[i];
                return (
                  <div key={phase.phase} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 text-xs">
                      <p className="font-semibold text-shin-charcoal">Phase {phase.phase}</p>
                      <p className="text-shin-mid">{phase.title}</p>
                    </div>
                    <div className="flex-1 relative h-7 bg-gray-100 rounded-md overflow-hidden">
                      <div
                        className={`absolute top-0 h-7 rounded-md ${barColors[i % barColors.length]} flex items-center justify-center`}
                        style={{ left: `${(start / totalMonths) * 100}%`, width: `${((end - start) / totalMonths) * 100}%` }}
                      >
                        <span className="text-white text-[10px] font-semibold px-1 truncate">{phase.duration}</span>
                      </div>
                    </div>
                    <div className="w-20 shrink-0 text-[10px] text-shin-mid">{phase.shinService}</div>
                  </div>
                );
              })}
              <div className="flex pl-[8.5rem] pr-20 justify-between text-[10px] text-shin-light mt-1">
                <span>0ヶ月</span><span>{totalMonths}ヶ月〜</span>
              </div>
            </div>

            {/* Phase details */}
            <div className="space-y-3">
              {roadmap.map((phase, i) => (
                <div key={phase.phase} className="border border-shin-accent rounded-xl overflow-hidden">
                  <div className={`px-4 py-2 flex items-center justify-between ${barColors[i % barColors.length].replace("bg-", "bg-").replace("bg-shin-blue", "bg-shin-blue")} text-white`}
                    style={{ background: ["#2D6BFF","#10b981","#8b5cf6","#f97316"][i % 4] }}>
                    <p className="font-semibold text-sm">Phase {phase.phase}：{phase.title}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="bg-white/20 px-2 py-0.5 rounded-full">{phase.duration}</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded-full">{phase.shinService}</span>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-0 divide-x divide-shin-accent">
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-shin-mid mb-1">GOALS</p>
                      <ul className="text-xs text-shin-charcoal space-y-1">{phase.goals?.map((g, gi) => <li key={gi}>• {g}</li>)}</ul>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-shin-mid mb-1">ACTIONS</p>
                      <ul className="text-xs text-shin-charcoal space-y-1">{phase.actions?.map((a, ai) => <li key={ai}>• {a}</li>)}</ul>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-shin-mid mb-1">METRICS</p>
                      <ul className="text-xs text-shin-charcoal space-y-1">{phase.metrics?.map((m, mi) => <li key={mi}>• {m}</li>)}</ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-shin-light py-4 print:py-2">
          <p>本レポートはSHINの生成AI活用診断システムにより自動生成されました</p>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #diagnostic-report, #diagnostic-report * { visibility: visible; }
          #diagnostic-report { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
