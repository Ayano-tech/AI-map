import { ChapterScore } from "./types";
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
