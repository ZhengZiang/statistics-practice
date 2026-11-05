import type { Question, AnswerRecord, WrongQuestion, MasteryData, TrendDataPoint, PracticeConfig } from '../types';
import { getStoragePrefix } from './auth';

const KEYS = {
  QUESTIONS: 'exam_questions',
  ANSWER_RECORDS: 'answer_records',
  WRONG_QUESTIONS: 'wrong_questions',
  MASTERY_DATA: 'mastery_data',
  TREND_DATA: 'trend_data',
  PRACTICE_DRAFT: 'practice_draft', // 练习断点续答草稿
  EXAM_DRAFT: 'exam_draft',         // 考试断点续答草稿
  EXAM_RECORDS: 'exam_records',     // 套卷考试历史记录
} as const;

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(getStoragePrefix() + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(getStoragePrefix() + key, JSON.stringify(value));
}

// Questions
export function loadQuestions(): Question[] {
  return getItem<Question[]>(KEYS.QUESTIONS, []);
}

export function saveQuestions(questions: Question[]): void {
  setItem(KEYS.QUESTIONS, questions);
}

// Answer Records
export function loadAnswerRecords(): AnswerRecord[] {
  return getItem<AnswerRecord[]>(KEYS.ANSWER_RECORDS, []);
}

export function saveAnswerRecords(records: AnswerRecord[]): void {
  setItem(KEYS.ANSWER_RECORDS, records);
}

export function addAnswerRecord(record: AnswerRecord): void {
  const records = loadAnswerRecords();
  records.push(record);
  saveAnswerRecords(records);
}

// Wrong Questions
export function loadWrongQuestions(): WrongQuestion[] {
  return getItem<WrongQuestion[]>(KEYS.WRONG_QUESTIONS, []);
}

export function saveWrongQuestions(wrongQuestions: WrongQuestion[]): void {
  setItem(KEYS.WRONG_QUESTIONS, wrongQuestions);
}

export function addWrongQuestion(wq: WrongQuestion): void {
  const existing = loadWrongQuestions();
  const idx = existing.findIndex((w) => w.questionId === wq.questionId);
  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...wq, retryCount: existing[idx].retryCount + 1 };
  } else {
    existing.push(wq);
  }
  saveWrongQuestions(existing);
}

// Mastery Data
export function loadMasteryData(): MasteryData[] {
  return getItem<MasteryData[]>(KEYS.MASTERY_DATA, []);
}

export function saveMasteryData(data: MasteryData[]): void {
  setItem(KEYS.MASTERY_DATA, data);
}

// Trend Data
export function loadTrendData(): TrendDataPoint[] {
  return getItem<TrendDataPoint[]>(KEYS.TREND_DATA, []);
}

export function saveTrendData(data: TrendDataPoint[]): void {
  setItem(KEYS.TREND_DATA, data);
}

export function addTrendPoint(point: TrendDataPoint): void {
  const existing = loadTrendData();
  existing.push(point);
  // Keep last 30 days
  const trimmed = existing.slice(-30);
  saveTrendData(trimmed);
}

// Check if data is initialized
export function isDataInitialized(): boolean {
  return localStorage.getItem(getStoragePrefix() + KEYS.QUESTIONS) !== null;
}

// ==================== 断点续答草稿 ====================

export interface PracticeDraft {
  config: PracticeConfig;
  questionIds: string[];
  answers: AnswerRecord[];
  startTime: number;
  sessionId: string;
  savedAt: number;
}

export function savePracticeDraft(draft: PracticeDraft): void {
  setItem(KEYS.PRACTICE_DRAFT, draft);
}
export function loadPracticeDraft(): PracticeDraft | null {
  return getItem<PracticeDraft | null>(KEYS.PRACTICE_DRAFT, null);
}
export function clearPracticeDraft(): void {
  localStorage.removeItem(getStoragePrefix() + KEYS.PRACTICE_DRAFT);
}

export interface ExamDraft {
  config: unknown; // ExamConfig 定义在页面层，这里透传
  questions: { id: string; score: number }[]; // 试卷题目及分值快照
  answers: Record<string, string>;
  timeLeft: number; // 剩余秒数
  savedAt: number;
}

export function saveExamDraft(draft: ExamDraft): void {
  setItem(KEYS.EXAM_DRAFT, draft);
}
export function loadExamDraft(): ExamDraft | null {
  return getItem<ExamDraft | null>(KEYS.EXAM_DRAFT, null);
}
export function clearExamDraft(): void {
  localStorage.removeItem(getStoragePrefix() + KEYS.EXAM_DRAFT);
}

// ==================== 套卷考试历史记录 ====================

export interface ExamRecord {
  id: string;
  title: string;
  timestamp: number;   // 交卷时间
  timeUsed: number;    // 用时（秒）
  totalScore: number;  // 试卷总分
  earnedScore: number; // 得分
  correctCount: number;
  questionCount: number;
  questions: { id: string; score: number; questionNumber: number }[]; // 题目快照
  answers: Record<string, string>;
}

const MAX_EXAM_RECORDS = 50; // 每账户最多保留 50 套

export function loadExamRecords(): ExamRecord[] {
  return getItem<ExamRecord[]>(KEYS.EXAM_RECORDS, []);
}

export function saveExamRecord(record: ExamRecord): void {
  const list = loadExamRecords();
  list.unshift(record); // 最新在前
  setItem(KEYS.EXAM_RECORDS, list.slice(0, MAX_EXAM_RECORDS));
}

export function deleteExamRecord(id: string): ExamRecord[] {
  const list = loadExamRecords().filter((r) => r.id !== id);
  setItem(KEYS.EXAM_RECORDS, list);
  return list;
}
