import { ChapterScore, WorkflowMetrics } from "./types";
import { LITERACY_TEST } from "./survey-data";

export function calculateScores(
  testAnswers: Record<number, number>
): { total: number; chapterScores: Record<string, ChapterScore> } {
  const chapterMap: Record<string, { correct: number; total: number }> = {};

  LITERACY_TEST.forEach((q, i) => {
    if (!chapterMap[q.chapter]) chapterMap[q.chapter] = { correct: 0, total: 0 };
    chapterMap[q.chapter].total++;
    if (testAnswers[i] === q.correctIndex) chapterMap[q.chapter].correct++;
  });

  const chapterScores: Record<string, ChapterScore> = {};
  let totalCorrect = 0;

  for (const [chapter, data] of Object.entries(chapterMap)) {
    const rate = data.total > 0 ? data.correct / data.total : 0;
    chapterScores[chapter] = { score: data.correct, max: data.total, rate };
    totalCorrect += data.correct;
  }

  return { total: totalCorrect, chapterScores };
}

export function calcWorkflowMetrics(
  answers: Record<string, string | string[]>
): WorkflowMetrics {
  const repeatItems = (answers["Q1-3"] as string[] | undefined) || [];
  const repeatFreqMap: Record<string, number> = {
    "1〜2回": 1, "3〜5回": 2, "6〜10回": 3, "10回以上": 4,
  };
  const repeatFreq = repeatFreqMap[answers["Q1-4"] as string] ?? 0;
  const repetition_score = Math.min(10, repeatItems.length * repeatFreq * 0.5);

  const toolMap: Record<string, number> = {
    "1つ": 1, "2つ": 2, "3つ": 3, "4つ以上": 4,
  };
  const tool_fragmentation = toolMap[answers["Q3-3"] as string] ?? 1;

  const transferMap: Record<string, number> = {
    "毎日ある": 4, "週に数回ある": 3, "月に数回ある": 2, "ほとんどない": 0,
  };
  const manual_transfer_freq = transferMap[answers["Q3-2"] as string] ?? 0;

  const mailMap: Record<string, number> = {
    "10件未満": 0, "10〜30件": 1, "31〜60件": 2, "61件以上": 3,
  };
  const contactMap: Record<string, number> = {
    "20件未満": 0, "20〜50件": 1, "51〜100件": 2, "100件以上": 3,
  };
  const communication_volume = Math.round(
    ((mailMap[answers["Q2-2"] as string] ?? 0) +
      (contactMap[answers["Q4-4"] as string] ?? 0)) / 2
  );

  const recurring_mail_flag =
    answers["Q2-3"] === "ある" ||
    answers["Q2-3"] === "あるかもしれないが意識したことがなかった"
      ? 1 : 0;

  const knowledgeMap: Record<string, number> = {
    "すぐに見つかる": 3,
    "時間はかかるが見つかる": 2,
    "見つからないことが多い": 1,
    "そもそも記録されていない": 0,
  };
  const knowledge_accessibility = knowledgeMap[answers["Q5-2"] as string] ?? 1;

  const gapMap: Record<string, number> = {
    "よくある": 2, "たまにある": 1, "ほとんどない": 0,
  };
  const info_sharing_gap = gapMap[answers["Q5-4"] as string] ?? 0;

  // Q6-2 is now the residual overload question (旧Q6-3) after Q6-1 was removed
  const overloadMap: Record<string, number> = {
    "ほぼなし": 0, "10時間未満": 1, "10〜30時間": 2, "30時間以上": 3,
  };
  const peak_overload = overloadMap[answers["Q6-2"] as string] ?? 0;

  const anxieties = (answers["Q7-4"] as string[] | undefined) || [];
  const ai_anxiety_level = anxieties.filter(a => a !== "特にない").length;

  return {
    repetition_score,
    tool_fragmentation,
    manual_transfer_freq,
    communication_volume,
    recurring_mail_flag,
    knowledge_accessibility,
    info_sharing_gap,
    peak_overload,
    ai_anxiety_level,
  };
}
