import type { Question, KnowledgePoint, BankFilter } from '../types';
import { getQuestionsByBank } from '../data/questions';
import { getAdaptiveQuestionWeights } from './mastery';
import type { MasteryData } from '../types';

interface SelectConfig {
  types: string[];
  chapters: string[];
  knowledgePoints: string[];
  bank?: BankFilter;
  screenedChapters?: string[];
  guideChapters?: string[];
}

// 按题库分别应用章节过滤后合并：系统题库用 chapters，竞赛题库用 screenedChapters，指导书原题用 guideChapters
// （各库章节名可能相同，需分开匹配）
// 只要有任何章节被选中，未选中的分组对应题库整体不纳入（与题库浏览页的分组语义一致）
function buildPool(config: SelectConfig): Question[] {
  const bank = config.bank ?? 'all';
  const banks: Exclude<BankFilter, 'all'>[] = bank === 'all' ? ['original', 'screened', 'guide'] : [bank];
  const sqSel = config.screenedChapters ?? [];
  const guideSel = config.guideChapters ?? [];
  const anySel = config.chapters.length > 0 || sqSel.length > 0 || guideSel.length > 0;
  let pool: Question[] = [];
  for (const b of banks) {
    const chapterSel = b === 'screened' ? sqSel : b === 'guide' ? guideSel : config.chapters;
    if (anySel && chapterSel.length === 0) continue;
    pool.push(
      ...getQuestionsByBank(b).filter((q) => {
        if (config.types.length > 0 && !config.types.includes(q.type)) return false;
        if (chapterSel.length > 0 && !chapterSel.includes(q.chapter)) return false;
        if (config.knowledgePoints.length > 0 && !config.knowledgePoints.includes(q.knowledgePoint)) return false;
        return true;
      })
    );
  }
  if (pool.length === 0) {
    pool = getQuestionsByBank(bank);
  }
  return pool;
}

export function selectAdaptiveQuestions(
  count: number,
  masteryData: MasteryData[],
  config: SelectConfig
): Question[] {
  const pool = buildPool(config);

  // Get adaptive weights
  const weights = getAdaptiveQuestionWeights(masteryData);

  // Sort by weight (weakest first) and add randomness
  const weighted = pool.map((q) => {
    const w = weights.get(q.knowledgePoint) || 1;
    // Add randomness factor
    return { question: q, weight: w * (0.5 + Math.random()) };
  });

  weighted.sort((a, b) => b.weight - a.weight);

  // Take top count, but ensure some diversity
  const selected: Question[] = [];
  const usedKps = new Set<string>();

  // First pass: pick from different knowledge points
  for (const item of weighted) {
    if (selected.length >= count) break;
    if (usedKps.size < Math.min(count, 8) && usedKps.has(item.question.knowledgePoint)) continue;
    selected.push(item.question);
    usedKps.add(item.question.knowledgePoint);
  }

  // Second pass: fill remaining
  for (const item of weighted) {
    if (selected.length >= count) break;
    if (!selected.includes(item.question)) {
      selected.push(item.question);
    }
  }

  return selected.slice(0, count);
}

export function selectRandomQuestions(count: number, config: SelectConfig): Question[] {
  const pool = buildPool(config);

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// 按知识点轮询抽样：每个知识点先各取 1 题，取完一轮再取下一轮，最大化覆盖面，
// 避免题目集中在少数几个知识点（组卷用）
export function pickDiverseByKnowledgePoint(pool: Question[], n: number): Question[] {
  if (n <= 0 || pool.length === 0) return [];
  const byKp = new Map<string, Question[]>();
  for (const q of pool) {
    const arr = byKp.get(q.knowledgePoint);
    if (arr) arr.push(q);
    else byKp.set(q.knowledgePoint, [q]);
  }
  // 知识点顺序与各知识点内部题目均乱序
  const kps = [...byKp.keys()].sort(() => Math.random() - 0.5);
  for (const kp of kps) byKp.get(kp)!.sort(() => Math.random() - 0.5);

  const picked: Question[] = [];
  for (let round = 0; picked.length < n; round++) {
    let took = false;
    for (const kp of kps) {
      if (picked.length >= n) break;
      const arr = byKp.get(kp)!;
      if (round < arr.length) {
        picked.push(arr[round]);
        took = true;
      }
    }
    if (!took) break; // 池子已耗尽
  }
  return picked;
}
