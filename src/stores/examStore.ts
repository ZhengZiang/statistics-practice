import { create } from 'zustand';
import type {
  Question,
  AnswerRecord,
  WrongQuestion,
  MasteryData,
  PracticeConfig,
  PracticeResult,
  TrendDataPoint,
  WeaknessItem,
} from '../types';
import { knowledgePoints } from '../data/knowledgePoints';
import { questionBank, getQuestionById } from '../data/questions';
import {
  loadAnswerRecords,
  saveAnswerRecords,
  loadWrongQuestions,
  saveWrongQuestions,
  loadMasteryData,
  saveMasteryData,
  loadTrendData,
  saveTrendData,
  addTrendPoint,
  isDataInitialized,
  savePracticeDraft,
  clearPracticeDraft,
  type PracticeDraft,
  saveExamRecord,
  type ExamRecord,
} from '../utils/storage';
import { updateMasteryData, getWeaknesses, getOverallStats, getMasteryLevel } from '../utils/mastery';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 将当前练习会话保存为断点续答草稿
function persistSessionDraft(session: ExamState['currentSession']): void {
  if (!session.config || session.questions.length === 0 || session.isFinished) return;
  try {
    savePracticeDraft({
      config: session.config,
      questionIds: session.questions.map((q) => q.id),
      answers: session.answers,
      startTime: session.startTime,
      sessionId: session.sessionId,
      savedAt: Date.now(),
    });
  } catch (e) {
    console.warn('Failed to save practice draft:', e);
  }
}

// 判定答案是否正确（练习与套卷考试共用）
function judgeAnswer(question: Question, userAnswer: string): boolean {
  if (question.type === 'single' || question.type === 'judge') {
    return userAnswer.trim() === question.correctAnswer.trim();
  }
  if (question.type === 'multiple') {
    // For multiple choice, sort both answers and compare
    const userSorted = userAnswer.replace(/\s/g, '').toUpperCase().split('').sort().join('');
    const correctSorted = question.correctAnswer.replace(/\s/g, '').toUpperCase().split('').sort().join('');
    return userSorted === correctSorted;
  }
  // Short answer and case analysis: keyword matching
  const userLower = userAnswer.toLowerCase();
  const correctLower = question.correctAnswer.toLowerCase();
  const keywords = correctLower.split(/[，,。.；;、\s]+/).filter((k) => k.length > 1);
  const matchCount = keywords.filter((k) => userLower.includes(k)).length;
  return keywords.length > 0 && matchCount / keywords.length >= 0.5;
}

interface ExamState {
  // Data
  initialized: boolean;
  answerRecords: AnswerRecord[];
  wrongQuestions: WrongQuestion[];
  masteryData: MasteryData[];
  trendData: TrendDataPoint[];

  // Practice session
  currentSession: {
    config: PracticeConfig | null;
    questions: Question[];
    currentIndex: number;
    answers: AnswerRecord[];
    startTime: number;
    sessionId: string;
    isFinished: boolean;
  };

  // Actions
  initialize: () => void;
  startPractice: (config: PracticeConfig, questions: Question[]) => void;
  submitAnswer: (questionId: string, userAnswer: string) => AnswerRecord;
  nextQuestion: () => void;
  finishPractice: () => PracticeResult;
  finishExam: (params: {
    title: string;
    questions: { question: Question; score: number; questionNumber: number }[];
    answers: Record<string, string>;
    timeUsed: number; // 秒
  }) => ExamRecord;
  resumePractice: (draft: PracticeDraft) => void;
  getCurrentQuestion: () => Question | null;
  getSessionProgress: () => { current: number; total: number };

  // Wrong questions
  removeWrongQuestion: (questionId: string) => void;
  markWrongReviewed: (questionId: string) => void;

  // Analysis
  getWeaknessItems: () => WeaknessItem[];
  getOverallStats: () => ReturnType<typeof getOverallStats>;
  getMasteryLevel: (rate: number) => { label: string; color: string };
  getKnowledgePointMastery: (kpId: string) => MasteryData | undefined;
}

export const useExamStore = create<ExamState>((set, get) => ({
  initialized: false,
  answerRecords: [],
  wrongQuestions: [],
  masteryData: [],
  trendData: [],
  currentSession: {
    config: null,
    questions: [],
    currentIndex: 0,
    answers: [],
    startTime: 0,
    sessionId: '',
    isFinished: false,
  },

  initialize: () => {
    if (get().initialized) return;

    const records = loadAnswerRecords();
    const wrong = loadWrongQuestions();
    let mastery = loadMasteryData();

    // Initialize mastery data if empty
    if (mastery.length === 0) {
      mastery = knowledgePoints.map((kp) => ({
        knowledgePointId: kp.id,
        totalAttempts: 0,
        correctCount: 0,
        masteryRate: 0,
        lastUpdated: 0,
      }));
      saveMasteryData(mastery);
    }

    const trend = loadTrendData();

    set({
      initialized: true,
      answerRecords: records,
      wrongQuestions: wrong,
      masteryData: mastery,
      trendData: trend,
    });
  },

  startPractice: (config, questions) => {
    const session: ExamState['currentSession'] = {
      config,
      questions,
      currentIndex: 0,
      answers: [],
      startTime: Date.now(),
      sessionId: generateId(),
      isFinished: false,
    };
    set({ currentSession: session });
    persistSessionDraft(session);
  },

  submitAnswer: (questionId, userAnswer) => {
    const state = get();
    const question = state.currentSession.questions.find((q) => q.id === questionId);
    if (!question) {
      const record: AnswerRecord = {
        id: generateId(),
        questionId,
        userAnswer,
        isCorrect: false,
        timestamp: Date.now(),
        sessionId: state.currentSession.sessionId,
      };
      return record;
    }

    // Judge the answer
    const isCorrect = judgeAnswer(question, userAnswer);

    const record: AnswerRecord = {
      id: generateId(),
      questionId,
      userAnswer,
      isCorrect,
      timestamp: Date.now(),
      sessionId: state.currentSession.sessionId,
    };

    const newAnswers = [...state.currentSession.answers, record];
    set({
      currentSession: { ...state.currentSession, answers: newAnswers },
    });
    persistSessionDraft(get().currentSession);

    return record;
  },

  nextQuestion: () => {
    const state = get();
    const nextIndex = state.currentSession.currentIndex + 1;
    const isFinished = nextIndex >= state.currentSession.questions.length;
    set({
      currentSession: {
        ...state.currentSession,
        currentIndex: isFinished ? state.currentSession.currentIndex : nextIndex,
        isFinished,
      },
    });
    persistSessionDraft(get().currentSession);
  },

  finishPractice: () => {
    clearPracticeDraft(); // 练习完成，清除续答草稿
    const state = get();
    const session = state.currentSession;
    const timeUsed = Math.round((Date.now() - session.startTime) / 1000);
    const correctCount = session.answers.filter((a) => a.isCorrect).length;
    const score = session.questions.length > 0
      ? Math.round((correctCount / session.questions.length) * 100)
      : 0;

    // Collect wrong question IDs
    const wrongIds = session.answers
      .filter((a) => !a.isCorrect)
      .map((a) => a.questionId);

    // Update answer records
    const allRecords = [...state.answerRecords, ...session.answers];

    // Update wrong questions
    const currentWrong = [...state.wrongQuestions];
    for (const answer of session.answers) {
      if (!answer.isCorrect) {
        const existingIdx = currentWrong.findIndex((w) => w.questionId === answer.questionId);
        if (existingIdx >= 0) {
          currentWrong[existingIdx] = {
            ...currentWrong[existingIdx],
            wrongAnswer: answer.userAnswer,
            timestamp: answer.timestamp,
            retryCount: currentWrong[existingIdx].retryCount + 1,
          };
        } else {
          currentWrong.push({
            id: generateId(),
            questionId: answer.questionId,
            wrongAnswer: answer.userAnswer,
            timestamp: answer.timestamp,
            isReviewed: false,
            retryCount: 0,
          });
        }
      }
    }

    // Update mastery data
    const masteryMap = new Map(state.masteryData.map((m) => [m.knowledgePointId, m]));
    for (const answer of session.answers) {
      const question = questionBank.find((q) => q.id === answer.questionId);
      if (question) {
        const existing = masteryMap.get(question.knowledgePoint);
        if (existing) {
          existing.totalAttempts += 1;
          if (answer.isCorrect) existing.correctCount += 1;
          existing.masteryRate = existing.totalAttempts > 0
            ? Math.round((existing.correctCount / existing.totalAttempts) * 100)
            : 0;
          existing.lastUpdated = Date.now();
        }
      }
    }
    const newMastery = Array.from(masteryMap.values());

    // Update trend data
    const today = new Date().toISOString().slice(0, 10);
    const existingTrend = [...state.trendData];
    const todayEntry = existingTrend.find((t) => t.date === today);
    if (todayEntry) {
      todayEntry.accuracy = Math.round(
        (todayEntry.accuracy * todayEntry.questionCount + correctCount * 100) /
        (todayEntry.questionCount + session.questions.length)
      );
      todayEntry.questionCount += session.questions.length;
    } else {
      existingTrend.push({
        date: today,
        accuracy: score,
        questionCount: session.questions.length,
      });
    }
    const trimmedTrend = existingTrend.slice(-30);

    const result: PracticeResult = {
      sessionId: session.sessionId,
      totalQuestions: session.questions.length,
      correctCount,
      score,
      timeUsed,
      answers: session.answers,
      wrongQuestionIds: wrongIds,
    };

    // Update state first, then persist to localStorage (best-effort)
    set({
      currentSession: { ...state.currentSession, isFinished: true },
      answerRecords: allRecords,
      wrongQuestions: currentWrong,
      masteryData: newMastery,
      trendData: trimmedTrend,
    });

    // Persist to localStorage with error handling - state is already updated
    try {
      saveAnswerRecords(allRecords);
    } catch (e) {
      console.warn('Failed to save answer records:', e);
    }
    try {
      saveWrongQuestions(currentWrong);
    } catch (e) {
      console.warn('Failed to save wrong questions:', e);
    }
    try {
      saveMasteryData(newMastery);
    } catch (e) {
      console.warn('Failed to save mastery data:', e);
    }
    try {
      saveTrendData(trimmedTrend);
    } catch (e) {
      console.warn('Failed to save trend data:', e);
    }

    return result;
  },

  // 套卷考试交卷：判分、写入答题记录/错题本/掌握度/趋势，并保存试卷记录
  finishExam: ({ title, questions, answers, timeUsed }) => {
    const state = get();
    const sessionId = generateId();
    const now = Date.now();

    // 判分并生成答题记录
    const newRecords: AnswerRecord[] = [];
    let totalScore = 0;
    let earnedScore = 0;
    let correctCount = 0;
    for (const { question, score } of questions) {
      totalScore += score;
      const userAnswer = answers[question.id] || '';
      const isCorrect = judgeAnswer(question, userAnswer);
      if (isCorrect) {
        earnedScore += score;
        correctCount += 1;
      }
      newRecords.push({
        id: generateId(),
        questionId: question.id,
        userAnswer,
        isCorrect,
        timestamp: now,
        sessionId,
      });
    }

    // Update answer records
    const allRecords = [...state.answerRecords, ...newRecords];

    // Update wrong questions
    const currentWrong = [...state.wrongQuestions];
    for (const record of newRecords) {
      if (!record.isCorrect) {
        const existingIdx = currentWrong.findIndex((w) => w.questionId === record.questionId);
        if (existingIdx >= 0) {
          currentWrong[existingIdx] = {
            ...currentWrong[existingIdx],
            wrongAnswer: record.userAnswer,
            timestamp: record.timestamp,
            retryCount: currentWrong[existingIdx].retryCount + 1,
          };
        } else {
          currentWrong.push({
            id: generateId(),
            questionId: record.questionId,
            wrongAnswer: record.userAnswer,
            timestamp: record.timestamp,
            isReviewed: false,
            retryCount: 0,
          });
        }
      }
    }

    // Update mastery data（getQuestionById 覆盖全部题库，含竞赛题）
    const masteryMap = new Map(state.masteryData.map((m) => [m.knowledgePointId, m]));
    for (const record of newRecords) {
      const question = getQuestionById(record.questionId);
      if (question) {
        const existing = masteryMap.get(question.knowledgePoint);
        if (existing) {
          existing.totalAttempts += 1;
          if (record.isCorrect) existing.correctCount += 1;
          existing.masteryRate = existing.totalAttempts > 0
            ? Math.round((existing.correctCount / existing.totalAttempts) * 100)
            : 0;
          existing.lastUpdated = now;
        }
      }
    }
    const newMastery = Array.from(masteryMap.values());

    // Update trend data
    const accuracyPct = questions.length > 0
      ? Math.round((correctCount / questions.length) * 100)
      : 0;
    const today = new Date().toISOString().slice(0, 10);
    const existingTrend = [...state.trendData];
    const todayEntry = existingTrend.find((t) => t.date === today);
    if (todayEntry) {
      todayEntry.accuracy = Math.round(
        (todayEntry.accuracy * todayEntry.questionCount + correctCount * 100) /
        (todayEntry.questionCount + questions.length)
      );
      todayEntry.questionCount += questions.length;
    } else {
      existingTrend.push({
        date: today,
        accuracy: accuracyPct,
        questionCount: questions.length,
      });
    }
    const trimmedTrend = existingTrend.slice(-30);

    // 试卷记录
    const examRecord: ExamRecord = {
      id: sessionId,
      title,
      timestamp: now,
      timeUsed,
      totalScore,
      earnedScore,
      correctCount,
      questionCount: questions.length,
      questions: questions.map((q) => ({
        id: q.question.id,
        score: q.score,
        questionNumber: q.questionNumber,
      })),
      answers,
    };

    // Update state first, then persist to localStorage (best-effort)
    set({
      answerRecords: allRecords,
      wrongQuestions: currentWrong,
      masteryData: newMastery,
      trendData: trimmedTrend,
    });

    try {
      saveAnswerRecords(allRecords);
    } catch (e) {
      console.warn('Failed to save answer records:', e);
    }
    try {
      saveWrongQuestions(currentWrong);
    } catch (e) {
      console.warn('Failed to save wrong questions:', e);
    }
    try {
      saveMasteryData(newMastery);
    } catch (e) {
      console.warn('Failed to save mastery data:', e);
    }
    try {
      saveTrendData(trimmedTrend);
    } catch (e) {
      console.warn('Failed to save trend data:', e);
    }
    try {
      saveExamRecord(examRecord);
    } catch (e) {
      console.warn('Failed to save exam record:', e);
    }

    return examRecord;
  },

  // 从断点草稿恢复练习
  resumePractice: (draft) => {
    const questions = draft.questionIds
      .map((id) => getQuestionById(id))
      .filter((q): q is Question => !!q);
    if (questions.length === 0) {
      clearPracticeDraft();
      return;
    }
    // 定位到第一个未作答的题
    const answeredIds = new Set(draft.answers.map((a) => a.questionId));
    const nextIdx = questions.findIndex((q) => !answeredIds.has(q.id));
    const allDone = nextIdx === -1;
    set({
      currentSession: {
        config: draft.config,
        questions,
        currentIndex: allDone ? questions.length - 1 : nextIdx,
        answers: draft.answers,
        startTime: draft.startTime,
        sessionId: draft.sessionId,
        isFinished: false,
      },
    });
    // 全部已作答（上次答完未点完成），直接结算
    if (allDone) get().finishPractice();
  },

  getCurrentQuestion: () => {
    const state = get();
    const { questions, currentIndex, isFinished } = state.currentSession;
    if (isFinished || questions.length === 0) return null;
    return questions[currentIndex] || null;
  },

  getSessionProgress: () => {
    const state = get();
    return {
      current: state.currentSession.currentIndex + 1,
      total: state.currentSession.questions.length,
    };
  },

  removeWrongQuestion: (questionId) => {
    const updated = get().wrongQuestions.filter((w) => w.questionId !== questionId);
    try {
      saveWrongQuestions(updated);
    } catch (e) {
      console.warn('Failed to save wrong questions:', e);
    }
    set({ wrongQuestions: updated });
  },

  markWrongReviewed: (questionId) => {
    const updated = get().wrongQuestions.map((w) =>
      w.questionId === questionId ? { ...w, isReviewed: true } : w
    );
    try {
      saveWrongQuestions(updated);
    } catch (e) {
      console.warn('Failed to save wrong questions:', e);
    }
    set({ wrongQuestions: updated });
  },

  getWeaknessItems: () => {
    return getWeaknesses(get().masteryData);
  },

  getOverallStats: () => {
    return getOverallStats(get().masteryData);
  },

  getMasteryLevel: (rate: number) => {
    return getMasteryLevel(rate);
  },

  getKnowledgePointMastery: (kpId: string) => {
    return get().masteryData.find((m) => m.knowledgePointId === kpId);
  },
}));
