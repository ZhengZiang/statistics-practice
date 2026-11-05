import type { AnswerRecord, MasteryData, KnowledgePoint, WeaknessItem } from '../types';
import { knowledgePoints } from '../data/knowledgePoints';
import { loadAnswerRecords, loadMasteryData, saveMasteryData } from './storage';

export function calculateMastery(knowledgePointId: string, records: AnswerRecord[]): number {
  const relevant = records.filter((r) => {
    // We determine the knowledge point by looking up the question
    return true; // Will be handled by the store
  });
  
  if (relevant.length === 0) return 0;
  
  const correct = relevant.filter((r) => r.isCorrect).length;
  return Math.round((correct / relevant.length) * 100);
}

export function updateMasteryData(
  knowledgePointId: string,
  totalAttempts: number,
  correctCount: number
): MasteryData {
  const masteryRate = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
  return {
    knowledgePointId,
    totalAttempts,
    correctCount,
    masteryRate,
    lastUpdated: Date.now(),
  };
}

export function recalculateAllMastery(records: AnswerRecord[]): MasteryData[] {
  // Group records by knowledge point (we need question data for this)
  // This will be populated from the store which has access to questions
  const masteryMap = new Map<string, { total: number; correct: number }>();

  for (const kp of knowledgePoints) {
    masteryMap.set(kp.id, { total: 0, correct: 0 });
  }

  return knowledgePoints.map((kp) => {
    const stats = masteryMap.get(kp.id) || { total: 0, correct: 0 };
    return updateMasteryData(kp.id, stats.total, stats.correct);
  });
}

export function getMasteryLevel(rate: number): { label: string; color: string } {
  if (rate >= 80) return { label: '熟练掌握', color: '#10B981' };
  if (rate >= 60) return { label: '基本掌握', color: '#F59E0B' };
  if (rate >= 40) return { label: '需要加强', color: '#F97316' };
  return { label: '严重薄弱', color: '#EF4444' };
}

export function getWeaknesses(masteryData: MasteryData[]): WeaknessItem[] {
  return masteryData
    .filter((m) => m.masteryRate < 70)
    .map((m) => {
      const kp = knowledgePoints.find((k) => k.id === m.knowledgePointId)!;
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (m.masteryRate < 40) priority = 'high';
      else if (m.masteryRate < 60) priority = 'medium';

      return {
        knowledgePoint: kp,
        masteryData: m,
        priority,
      };
    })
    .sort((a, b) => a.masteryData.masteryRate - b.masteryData.masteryRate);
}

export function getOverallStats(masteryData: MasteryData[]) {
  const totalKp = masteryData.length;
  const masteredKp = masteryData.filter((m) => m.masteryRate >= 80).length;
  const weakKp = masteryData.filter((m) => m.masteryRate < 60).length;
  const totalAttempts = masteryData.reduce((sum, m) => sum + m.totalAttempts, 0);
  const totalCorrect = masteryData.reduce((sum, m) => sum + m.correctCount, 0);
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  return { totalKp, masteredKp, weakKp, totalAttempts, totalCorrect, overallAccuracy };
}

export function getAdaptiveQuestionWeights(masteryData: MasteryData[]): Map<string, number> {
  const weights = new Map<string, number>();

  for (const md of masteryData) {
    if (md.masteryRate < 40) {
      weights.set(md.knowledgePointId, 4); // 严重薄弱，高权重
    } else if (md.masteryRate < 60) {
      weights.set(md.knowledgePointId, 3); // 薄弱
    } else if (md.masteryRate < 80) {
      weights.set(md.knowledgePointId, 2); // 一般
    } else {
      weights.set(md.knowledgePointId, 1); // 已掌握
    }
  }

  return weights;
}
