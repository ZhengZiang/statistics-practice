export type QuestionType = 'single' | 'multiple' | 'judge' | 'short' | 'case';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionCategory = 'statistics' | 'data-mining';

// 题库来源：original=系统原题库，screened=竞赛筛选题库，guide=学习指导书原题
export type QuestionBankId = 'original' | 'screened' | 'guide';
export type BankFilter = 'all' | QuestionBankId;

export interface Question {
  id: string;
  type: QuestionType;
  chapter: string;
  knowledgePoint: string;
  difficulty: Difficulty;
  stem: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  category: QuestionCategory;
  bank?: QuestionBankId; // 缺省视为 original
}

export interface AnswerRecord {
  id: string;
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timestamp: number;
  sessionId: string;
}

export interface WrongQuestion {
  id: string;
  questionId: string;
  wrongAnswer: string;
  timestamp: number;
  isReviewed: boolean;
  retryCount: number;
}

export interface KnowledgePoint {
  id: string;
  name: string;
  chapter: string;
  category: QuestionCategory;
}

export interface MasteryData {
  knowledgePointId: string;
  totalAttempts: number;
  correctCount: number;
  masteryRate: number;
  lastUpdated: number;
}

export interface PracticeConfig {
  types: QuestionType[];
  chapters: string[];
  knowledgePoints: string[];
  questionCount: number;
  adaptiveMode: boolean;
  bank?: BankFilter;
  screenedChapters?: string[]; // 统计学竞赛题已选章节（screened 库专用，避免与系统题库章节名冲突）
  guideChapters?: string[]; // 指导书原题已选章节（guide 库专用，同理分开匹配）
}

export interface PracticeResult {
  sessionId: string;
  totalQuestions: number;
  correctCount: number;
  score: number;
  timeUsed: number;
  answers: AnswerRecord[];
  wrongQuestionIds: string[];
}

export interface WeaknessItem {
  knowledgePoint: KnowledgePoint;
  masteryData: MasteryData;
  priority: 'high' | 'medium' | 'low';
}

export interface TrendDataPoint {
  date: string;
  accuracy: number;
  questionCount: number;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
  short: '简答题',
  case: '案例分析题',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export const PRIORITY_LABELS: Record<string, string> = {
  high: '急需加强',
  medium: '需要巩固',
  low: '保持即可',
};

export const QUESTION_BANK_LABELS: Record<BankFilter, string> = {
  all: '全部题库',
  original: '系统题库',
  screened: '竞赛筛选题库',
  guide: '指导书原题',
};
