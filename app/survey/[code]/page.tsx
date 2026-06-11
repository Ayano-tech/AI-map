"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Company, SurveyResponse } from "@/lib/types";
import { SURVEY_SECTIONS, LITERACY_TEST } from "@/lib/survey-data";
import { calculateScores, calcWorkflowMetrics } from "@/lib/scoring";

type Phase = "loading" | "intro" | "survey" | "test-intro" | "test" | "email" | "complete" | "error";

export default function SurveyPage() {
  const params = useParams();
  const code = params.code as string;

  const [phase, setPhase] = useState<Phase>("loading");
  const [company, setCompany] = useState<Company | null>(null);

  // Survey state
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string | string[]>>({});

  // Email state
  const [email, setEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  // Test state
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Completion state
  const [finalResponse, setFinalResponse] = useState<SurveyResponse | null>(null);

  useEffect(() => {
    fetch("/api/companies")
      .then(r => r.json())
      .then(data => {
        const found = data.companies?.find((c: Company) => c.code === code);
        if (found) { setCompany(found); setPhase("intro"); }
        else setPhase("error");
      })
      .catch(() => setPhase("error"));
  }, [code]);

  // Get visible questions for current section
  function getVisibleQuestions(sIdx: number) {
    const section = SURVEY_SECTIONS[sIdx];
    return section.questions.filter(q => {
      if (!q.condition) return true;
      const dep = surveyAnswers[q.condition.dependsOn];
      if (Array.isArray(dep)) return dep.some(v => q.condition!.values.includes(v));
      return q.condition.values.includes(dep as string);
    });
  }

  const currentSection = SURVEY_SECTIONS[sectionIndex];
  const visibleQuestions = phase === "survey" ? getVisibleQuestions(sectionIndex) : [];
  const currentQuestion = visibleQuestions[questionIndex];

  // Total progress calculation
  const totalSurveyQuestions = SURVEY_SECTIONS.reduce((acc, _, si) => acc + getVisibleQuestions(si).length, 0);
  const answeredSurvey = SURVEY_SECTIONS.slice(0, sectionIndex).reduce((acc, _, si) => acc + getVisibleQuestions(si).length, 0) + questionIndex;
  const totalQuestions = totalSurveyQuestions + LITERACY_TEST.length;
  const answeredQuestions = phase === "test" ? totalSurveyQuestions + testIndex : answeredSurvey;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  function handleSurveyAnswer(value: string | string[]) {
    if (!currentQuestion) return;
    setSurveyAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  }

  function handleNext() {
    const vq = getVisibleQuestions(sectionIndex);
    if (questionIndex < vq.length - 1) {
      setQuestionIndex(qi => qi + 1);
    } else if (sectionIndex < SURVEY_SECTIONS.length - 1) {
      setSectionIndex(si => si + 1);
      setQuestionIndex(0);
    } else {
      setPhase("test-intro");
    }
  }

  function handleBack() {
    if (questionIndex > 0) {
      setQuestionIndex(qi => qi - 1);
    } else if (sectionIndex > 0) {
      const prevSectionIdx = sectionIndex - 1;
      const prevVisible = getVisibleQuestions(prevSectionIdx);
      setSectionIndex(prevSectionIdx);
      setQuestionIndex(Math.max(0, prevVisible.length - 1));
    }
  }

  function handleTestAnswer(optionIndex: number) {
    setSelectedOption(optionIndex);
  }

  function handleTestNext() {
    if (selectedOption === null) return;
    const newAnswers = { ...testAnswers, [testIndex]: selectedOption };
    setTestAnswers(newAnswers);
    setSelectedOption(null);
    if (testIndex < LITERACY_TEST.length - 1) {
      setTestIndex(ti => ti + 1);
    } else {
      // Complete
      const { total, chapterScores } = calculateScores(newAnswers);
      const workflowMetrics = calcWorkflowMetrics(surveyAnswers);
      const basic: Record<string, string> = {};
      Object.entries(surveyAnswers).forEach(([k, v]) => {
        if (SURVEY_SECTIONS[0].questions.some(q => q.id === k)) {
          basic[k] = Array.isArray(v) ? v.join(", ") : v;
        }
      });
      const resp: SurveyResponse = {
        companyId: company!.id,
        submittedAt: new Date().toISOString(),
        basic,
        surveyAnswers,
        testAnswers: newAnswers,
        testScore: total,
        chapterScores,
        workflowMetrics,
      };
      setFinalResponse(resp);
      setPhase("email");
    }
  }

  function handleTestBack() {
    if (testIndex > 0) {
      setTestIndex(ti => ti - 1);
      setSelectedOption(testAnswers[testIndex - 1] ?? null);
    } else {
      setPhase("survey");
      setSectionIndex(SURVEY_SECTIONS.length - 1);
      const lastVisible = getVisibleQuestions(SURVEY_SECTIONS.length - 1);
      setQuestionIndex(lastVisible.length - 1);
    }
  }

  if (phase === "loading") return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(160deg, #1A2A3E 0%, #2A4A6E 50%, #6AA3D8 100%)" }}>
      <div className="text-white text-center"><p className="text-xl">読み込み中...</p></div>
    </div>
  );

  if (phase === "error") return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(160deg, #1A2A3E 0%, #2A4A6E 50%, #6AA3D8 100%)" }}>
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
        <p className="text-shin-charcoal font-semibold mb-2">コードが見つかりません</p>
        <p className="text-shin-mid text-sm mb-6">アクセスコードをご確認ください</p>
        <a href="/" className="bg-shin-blue text-white rounded-lg px-6 py-2.5 font-semibold inline-block">トップへ戻る</a>
      </div>
    </div>
  );

  if (phase === "intro") return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(160deg, #1A2A3E 0%, #2A4A6E 50%, #6AA3D8 100%)" }}>
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
        <p className="text-shin-mid text-sm mb-1">参加企業</p>
        <h2 className="text-shin-charcoal text-2xl font-bold mb-6">{company?.name}</h2>
        <div className="space-y-3 text-sm text-shin-mid mb-8">
          <p>• 所要時間：約15〜20分</p>
          <p>• 回答はすべて匿名で処理されます</p>
          <p>• 業務アンケート（8セクション）＋AIリテラシーテスト（20問）で構成されています</p>
          <p>• 途中で中断した場合、データは保存されません</p>
        </div>
        <button onClick={() => setPhase("survey")} className="w-full bg-shin-blue text-white rounded-lg px-6 py-3 font-semibold shadow-md hover:bg-shin-blue-dark transition-colors">
          診断を開始する →
        </button>
      </div>
    </div>
  );

  if (phase === "complete" && finalResponse) {
    const totalScore = finalResponse.testScore;
    const totalMax = LITERACY_TEST.length;
    const pct = Math.round((totalScore / totalMax) * 100);
    const level = pct >= 80 ? 4 : pct >= 60 ? 3 : pct >= 40 ? 2 : 1;
    const levelColors: Record<number, string> = { 1: "#D94F4F", 2: "#E8A838", 3: "#6AA3D8", 4: "#34A77B" };
    const levelLabels: Record<number, string> = { 1: "入門レベル", 2: "基礎レベル", 3: "実践レベル", 4: "推進レベル" };
    const levelDescs: Record<number, string> = {
      1: "生成AIの基礎知識の習得から始めましょう。",
      2: "基本は押さえています。実践的な活用スキルを伸ばしましょう。",
      3: "実務でAIを活用できるレベルです。チームへの展開を検討してみてください。",
      4: "組織のAI活用を牽引できる推進者レベルです。"
    };
    const chapters = ["基本理解", "Delegation", "Description", "Discernment", "Diligence"];
    const wrongQuestions = LITERACY_TEST.filter((q, i) => finalResponse.testAnswers[i] !== q.correctIndex);

    return (
      <div className="min-h-screen px-4 py-8" style={{ background: "linear-gradient(160deg, #1A2A3E 0%, #2A4A6E 50%, #6AA3D8 100%)" }}>
        <div className="max-w-xl mx-auto space-y-4">

          {/* Score card */}
          <div className="bg-white rounded-2xl p-7 shadow-2xl text-center">
            <p className="text-shin-mid text-sm mb-1">診断完了・個人レポート</p>
            <h2 className="text-shin-charcoal text-2xl font-bold mb-4">お疲れさまでした！</h2>
            <div className="inline-block mb-3">
              <span className="text-6xl font-bold" style={{ color: levelColors[level] }}>{totalScore}</span>
              <span className="text-shin-mid text-xl"> / {totalMax}</span>
            </div>
            <div className="mb-3">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: levelColors[level] }}>
                Lv.{level}　{levelLabels[level]}
              </span>
            </div>
            <p className="text-shin-mid text-sm">{levelDescs[level]}</p>
          </div>

          {/* Chapter scores */}
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <h3 className="font-bold text-shin-charcoal mb-4">章別スコア</h3>
            <div className="space-y-3">
              {chapters.map(ch => {
                const cs = finalResponse.chapterScores[ch];
                if (!cs) return null;
                const chPct = Math.round(cs.rate * 100);
                const chColor = chPct >= 80 ? "#34A77B" : chPct >= 60 ? "#6AA3D8" : chPct >= 40 ? "#E8A838" : "#D94F4F";
                return (
                  <div key={ch}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-shin-charcoal">{ch}</span>
                      <span className="text-sm font-bold" style={{ color: chColor }}>{cs.score}/{cs.max}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${chPct}%`, backgroundColor: chColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wrong answers review */}
          {wrongQuestions.length > 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-2xl">
              <h3 className="font-bold text-shin-charcoal mb-1">復習ポイント</h3>
              <p className="text-shin-mid text-xs mb-4">{wrongQuestions.length}問、正解と異なる選択をしました。解説を確認しておきましょう。</p>
              <div className="space-y-4">
                {LITERACY_TEST.map((q, i) => {
                  const answered = finalResponse.testAnswers[i];
                  const isCorrect = answered === q.correctIndex;
                  if (isCorrect) return null;
                  return (
                    <div key={i} className="border border-red-100 rounded-xl p-4 bg-red-50">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="shrink-0 text-red-400 font-bold text-sm">✗</span>
                        <p className="text-shin-charcoal text-sm font-medium">{q.question}</p>
                      </div>
                      <div className="ml-5 space-y-1 mb-3 text-xs">
                        <p className="text-red-600">あなたの回答：{q.options[answered]}</p>
                        <p className="text-green-700 font-semibold">正解：{q.options[q.correctIndex]}</p>
                      </div>
                      <div className="ml-5 bg-white rounded-lg p-3 text-xs text-shin-mid leading-relaxed border border-red-100">
                        <span className="font-semibold text-shin-charcoal">解説：</span>{q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-2xl text-center">
              <p className="text-4xl mb-2">🎉</p>
              <p className="font-bold text-shin-charcoal">全問正解！</p>
              <p className="text-shin-mid text-sm mt-1">AIリテラシーの基礎知識は完璧です。</p>
            </div>
          )}

          {/* Correct answers */}
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <h3 className="font-bold text-shin-charcoal mb-4">全問題の正解一覧</h3>
            <div className="space-y-3">
              {LITERACY_TEST.map((q, i) => {
                const answered = finalResponse.testAnswers[i];
                const isCorrect = answered === q.correctIndex;
                return (
                  <div key={i} className={`rounded-xl p-3 border ${isCorrect ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
                    <div className="flex items-start gap-2">
                      <span className={`shrink-0 font-bold text-sm ${isCorrect ? "text-green-500" : "text-red-400"}`}>{isCorrect ? "✓" : "✗"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-shin-mid mb-0.5">{q.chapter}</p>
                        <p className="text-shin-charcoal text-sm">{q.question}</p>
                        <p className="text-xs mt-1 font-semibold text-green-700">正解：{q.options[q.correctIndex]}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[#BCC8DE] text-xs text-center pb-4">
            回答データは企業の診断レポートに活用されます。ご協力ありがとうございました。
          </p>
        </div>
      </div>
    );
  }

  // Survey phase
  if (phase === "survey" && currentQuestion) {
    const currentAnswer = surveyAnswers[currentQuestion.id];
    const canProceed = currentQuestion.type === "single"
      ? !!currentAnswer
      : Array.isArray(currentAnswer) && currentAnswer.length > 0;

    return (
      <div className="min-h-screen flex flex-col bg-[#F5F8FC]">
        {/* Header */}
        <div className="bg-shin-dark text-white px-4 py-3 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[#BCC8DE] text-xs">{company?.name}</span>
              <span className="text-[#BCC8DE] text-xs">{currentSection.title}</span>
            </div>
            <div className="w-full bg-shin-blue/30 rounded-full h-1.5">
              <div className="bg-shin-blue h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 flex items-start justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            <div className="bg-shin-blue-light text-shin-blue-dark text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
              {currentSection.title}
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
              <p className="text-shin-charcoal text-lg font-semibold mb-6">{currentQuestion.text}</p>
              {currentQuestion.type === "single" ? (
                <div className="space-y-3">
                  {currentQuestion.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleSurveyAnswer(opt)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${currentAnswer === opt ? "border-shin-blue bg-shin-blue-light text-shin-charcoal font-semibold" : "border-shin-accent bg-white text-shin-charcoal hover:border-shin-blue hover:bg-shin-blue-pale"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-shin-mid text-xs mb-2">複数選択可</p>
                  {currentQuestion.options.map(opt => {
                    const selected = Array.isArray(currentAnswer) && currentAnswer.includes(opt);
                    return (
                      <button
                        key={opt}
                        onClick={() => {
                          const current = Array.isArray(currentAnswer) ? currentAnswer : [];
                          const next = selected ? current.filter(v => v !== opt) : [...current, opt];
                          handleSurveyAnswer(next);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${selected ? "border-shin-blue bg-shin-blue-light text-shin-charcoal font-semibold" : "border-shin-accent bg-white text-shin-charcoal hover:border-shin-blue hover:bg-shin-blue-pale"}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <button onClick={handleBack} disabled={sectionIndex === 0 && questionIndex === 0} className="text-shin-mid hover:text-shin-charcoal disabled:opacity-30 px-4 py-2">← 戻る</button>
              <button onClick={handleNext} disabled={!canProceed} className="bg-shin-blue text-white rounded-lg px-6 py-2.5 font-semibold disabled:opacity-50 hover:bg-shin-blue-dark transition-colors">
                {sectionIndex === SURVEY_SECTIONS.length - 1 && questionIndex === visibleQuestions.length - 1 ? "テストへ進む →" : "次へ →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Email input screen
  if (phase === "email" && finalResponse) {
    async function handleEmailSubmit(skipEmail = false) {
      if (!finalResponse) return;
      setEmailSubmitting(true);
      const resp = skipEmail
        ? finalResponse
        : { ...finalResponse, basic: { ...finalResponse.basic, email } };
      if (company?.sheetId) {
        await fetch("/api/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companySheetId: company.sheetId, response: resp }),
        }).catch(console.error);
      }
      setFinalResponse(resp);
      setPhase("complete");
    }
    const totalScore = finalResponse.testScore;
    const totalMax = LITERACY_TEST.length;
    const pct = Math.round((totalScore / totalMax) * 100);
    const level = pct >= 80 ? 4 : pct >= 60 ? 3 : pct >= 40 ? 2 : 1;
    const levelColors: Record<number, string> = { 1: "#D94F4F", 2: "#E8A838", 3: "#6AA3D8", 4: "#34A77B" };
    const levelLabels: Record<number, string> = { 1: "入門レベル", 2: "基礎レベル", 3: "実践レベル", 4: "推進レベル" };
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "linear-gradient(160deg, #1A2A3E 0%, #2A4A6E 50%, #6AA3D8 100%)" }}>
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
          <div className="text-center mb-6">
            <p className="text-shin-mid text-sm mb-1">テスト完了</p>
            <div className="inline-block mb-3">
              <span className="text-4xl font-bold" style={{ color: levelColors[level] }}>{totalScore}</span>
              <span className="text-shin-mid text-base"> / {totalMax}</span>
            </div>
            <div>
              <span className="inline-block px-4 py-1 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: levelColors[level] }}>
                Lv.{level} {levelLabels[level]}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <p className="font-semibold text-shin-charcoal mb-1">結果を記録しますか？</p>
            <p className="text-shin-mid text-xs mb-4">メールアドレスを入力すると、あなた個人のスコアを後から確認できます。入力は任意です。</p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="例：your@email.com"
              className="w-full border-2 border-shin-accent rounded-xl px-4 py-3 focus:outline-none focus:border-shin-blue text-shin-charcoal"
            />
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleEmailSubmit(false)}
              disabled={emailSubmitting || !email.includes("@")}
              className="w-full bg-shin-blue text-white rounded-xl py-3 font-semibold disabled:opacity-40 hover:bg-shin-blue-dark transition-colors"
            >
              {emailSubmitting ? "送信中..." : "記録して結果を見る →"}
            </button>
            <button
              onClick={() => handleEmailSubmit(true)}
              disabled={emailSubmitting}
              className="w-full text-shin-mid text-sm py-2 hover:text-shin-charcoal transition-colors"
            >
              メールアドレスなしで結果を見る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Test intro screen
  if (phase === "test-intro") {
    const chapters = [
      { name: "基本理解", count: 5, desc: "生成AIの仕組み・リスク・できること" },
      { name: "Delegation（委任判断力）", count: 4, desc: "AIに任せてよい業務の線引き" },
      { name: "Description（指示設計力）", count: 4, desc: "的確なプロンプトの設計" },
      { name: "Discernment（出力評価力）", count: 4, desc: "AI出力の批判的評価" },
      { name: "Diligence（倫理・継続力）", count: 3, desc: "セキュリティ・倫理・継続改善" },
    ];
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F8FC]">
        <div className="bg-shin-dark text-white px-4 py-3">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <span className="text-[#BCC8DE] text-xs">{company?.name}</span>
            <span className="text-[#BCC8DE] text-xs">アンケート完了</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-xl">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="text-center mb-6">
                <span className="inline-block bg-shin-blue text-white text-xs font-bold px-3 py-1 rounded-full mb-3">ここからはテストです</span>
                <h2 className="text-2xl font-bold text-shin-charcoal mb-2">AIリテラシーテスト</h2>
                <p className="text-shin-mid text-sm">アンケートへのご回答ありがとうございました。<br />続いて、AIに関する知識を確認する全20問のテストです。</p>
              </div>

              <div className="bg-shin-blue-pale rounded-xl px-5 py-3 mb-5 flex items-center gap-3">
                <span className="text-2xl">⏱</span>
                <div>
                  <p className="font-semibold text-shin-charcoal text-sm">所要時間の目安：約5〜8分</p>
                  <p className="text-shin-mid text-xs">全20問・正解・不正解は問いません</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs font-semibold text-shin-mid mb-3">テストの構成</p>
                <div className="space-y-2">
                  {chapters.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-shin-blue text-white text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                      <div className="flex-1">
                        <span className="font-semibold text-shin-charcoal">{c.name}</span>
                        <span className="text-shin-mid ml-1">（{c.count}問）</span>
                        <p className="text-shin-light text-xs">{c.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setPhase("test")}
                className="w-full bg-shin-blue text-white rounded-xl py-3 font-semibold hover:bg-shin-blue-dark transition-colors"
              >
                テストを開始する →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Test phase
  if (phase === "test") {
    const q = LITERACY_TEST[testIndex];
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F8FC]">
        <div className="bg-shin-dark text-white px-4 py-3 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[#BCC8DE] text-xs">{company?.name}</span>
              <span className="text-[#BCC8DE] text-xs">AIリテラシーテスト {testIndex + 1}/{LITERACY_TEST.length}</span>
            </div>
            <div className="w-full bg-shin-blue/30 rounded-full h-1.5">
              <div className="bg-shin-blue h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            <div className="bg-shin-blue-light text-shin-blue-dark text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
              {q.chapter}
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
              <p className="text-shin-charcoal text-lg font-semibold mb-6">{q.question}</p>
              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleTestAnswer(i)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${selectedOption === i ? "border-shin-blue bg-shin-blue-light text-shin-charcoal font-semibold" : "border-shin-accent bg-white text-shin-charcoal hover:border-shin-blue hover:bg-shin-blue-pale"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <button onClick={handleTestBack} className="text-shin-mid hover:text-shin-charcoal px-4 py-2">← 戻る</button>
              <button onClick={handleTestNext} disabled={selectedOption === null} className="bg-shin-blue text-white rounded-lg px-6 py-2.5 font-semibold disabled:opacity-50 hover:bg-shin-blue-dark transition-colors">
                {testIndex === LITERACY_TEST.length - 1 ? "診断を完了する →" : "次へ →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
