import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../stores/examStore';
import { questionBank, getQuestionById } from '../data/questions';
import { screenedQuestionBank } from '../data/questionsScreened';
import { guideQuestionBank } from '../data/questionsGuide';
import { saveExamDraft, loadExamDraft, clearExamDraft, loadExamRecords, deleteExamRecord, type ExamDraft, type ExamRecord } from '../utils/storage';
import ChapterRangePicker, { type ChapterSelection } from '../components/ChapterRangePicker';
import { pickDiverseByKnowledgePoint } from '../utils/questionSelector';
import type { Question, QuestionType } from '../types';
import { QUESTION_TYPE_LABELS } from '../types';
import {
  FileText,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Timer,
  Trophy,
  Settings2,
  BookOpen,
  RotateCcw,
  ArrowRight,
  Printer,
  Eye,
  Edit3,
  Download,
  History,
  Trash2,
} from 'lucide-react';

type ExamPhase = 'config' | 'preview' | 'answering' | 'result';

// 组卷标准：题型分值
const TYPE_SCORES: Record<QuestionType, number> = {
  single: 1,
  multiple: 2,
  judge: 1,
  short: 5,
  case: 10,
};

// 标准组卷题量：单选50 + 多选10 + 判断10 + 简答2 + 案例1 = 73 题 / 100 分
const DEFAULT_TYPE_COUNTS: Record<QuestionType, number> = {
  single: 50,
  multiple: 10,
  judge: 10,
  short: 2,
  case: 1,
};

const TYPE_MAX_COUNTS: Record<QuestionType, number> = {
  single: 60,
  multiple: 30,
  judge: 30,
  short: 20,
  case: 10,
};

interface ExamConfig {
  title: string;
  textbook: 'statistics' | 'data-mining' | 'both';
  chapters: string[];
  typeDistribution: { type: QuestionType; count: number }[];
  difficultyRatio: { easy: number; medium: number; hard: number };
  totalScore: number;
  timeLimit: number; // minutes
}

interface ExamQuestion extends Question {
  score: number;
  questionNumber: number;
}

function ConfigPanel({ onGenerate }: { onGenerate: (exam: ExamConfig, questions: ExamQuestion[]) => void }) {
  const [title, setTitle] = useState('综合测试卷');
  const [textbook, setTextbook] = useState<'statistics' | 'data-mining' | 'both'>('both');
  const [chapterSel, setChapterSel] = useState<ChapterSelection>({ original: [], screened: [], guide: [] });
  const [typeCounts, setTypeCounts] = useState(DEFAULT_TYPE_COUNTS);
  const [difficulty, setDifficulty] = useState({ easy: 40, medium: 40, hard: 20 });
  const [timeLimit, setTimeLimit] = useState(120);

  const totalQuestions = (Object.keys(typeCounts) as QuestionType[]).reduce((s, t) => s + typeCounts[t], 0);
  const totalScore = (Object.keys(typeCounts) as QuestionType[]).reduce((s, t) => s + typeCounts[t] * TYPE_SCORES[t], 0);

  const handleGenerate = () => {
    // Build filters
    let pool = [...questionBank];

    // Filter by textbook
    if (textbook === 'statistics') pool = pool.filter((q) => !q.chapter.startsWith('DM'));
    if (textbook === 'data-mining') pool = pool.filter((q) => q.chapter.startsWith('DM'));

    // Filter by chapters：选了哪一组就只出哪一库的题（与题库浏览页分组语义一致）
    const anySel = chapterSel.original.length > 0 || chapterSel.screened.length > 0 || chapterSel.guide.length > 0;
    if (anySel) {
      pool = chapterSel.original.length > 0
        ? pool.filter((q) => chapterSel.original.includes(q.chapter))
        : [];
      // 统计学竞赛题：选中即纳入（统计学教材范围）
      if (textbook !== 'data-mining' && chapterSel.screened.length > 0) {
        pool = pool.concat(screenedQuestionBank.filter((q) => chapterSel.screened.includes(q.chapter)));
      }
      // 指导书原题：选中即纳入（统计学教材范围）
      if (textbook !== 'data-mining' && chapterSel.guide.length > 0) {
        pool = pool.concat(guideQuestionBank.filter((q) => chapterSel.guide.includes(q.chapter)));
      }
    }

    const config: ExamConfig = {
      title,
      textbook,
      chapters: [...chapterSel.original, ...chapterSel.screened, ...chapterSel.guide],
      typeDistribution: [
        { type: 'single', count: typeCounts.single },
        { type: 'multiple', count: typeCounts.multiple },
        { type: 'judge', count: typeCounts.judge },
        { type: 'short', count: typeCounts.short },
        { type: 'case', count: typeCounts.case },
      ],
      difficultyRatio: difficulty,
      totalScore,
      timeLimit,
    };

    // Select questions
    const selected: ExamQuestion[] = [];
    const missingTypes: string[] = [];
    let questionNumber = 1;

    const types: QuestionType[] = ['single', 'multiple', 'judge', 'short', 'case'];

    for (const type of types) {
      const typePool = pool.filter((q) => q.type === type);
      const count = typeCounts[type as keyof typeof typeCounts] || 0;
      if (count === 0 || typePool.length === 0) continue;

      // Try to match difficulty ratio
      const easyCount = Math.round(count * difficulty.easy / 100);
      const mediumCount = Math.round(count * difficulty.medium / 100);
      const hardCount = count - easyCount - mediumCount;

      const easyPool = typePool.filter((q) => q.difficulty === 'easy');
      const mediumPool = typePool.filter((q) => q.difficulty === 'medium');
      const hardPool = typePool.filter((q) => q.difficulty === 'hard');

      const shuffled = (arr: Question[], n: number) => pickDiverseByKnowledgePoint(arr, n);

      const pickEasy = shuffled(easyPool, easyCount);
      const pickMedium = shuffled(mediumPool, mediumCount);
      let pickHard = shuffled(hardPool, hardCount);

      // Fill remaining slots
      const remaining = count - pickEasy.length - pickMedium.length - pickHard.length;
      if (remaining > 0) {
        const allPicked = new Set([...pickEasy, ...pickMedium, ...pickHard].map((q) => q.id));
        const extra = shuffled(typePool.filter((q) => !allPicked.has(q.id)), remaining);
        pickHard = [...pickHard, ...extra];
      }

      const typeQuestions = [...pickEasy, ...pickMedium, ...pickHard].slice(0, count);
      const scorePerQ = TYPE_SCORES[type];
      for (const q of typeQuestions) {
        selected.push({ ...q, score: scorePerQ, questionNumber: questionNumber++ });
      }
      // 配置要求但该范围/难度下一题未出 -> 记录缺失, 生成后提示
      if (count > 0 && typeQuestions.length === 0) missingTypes.push(QUESTION_TYPE_LABELS[type]);
    }

    if (missingTypes.length > 0) {
      window.alert(`提示：当前章节范围内无法抽到以下题型的题目，试卷将不包含：${missingTypes.join('、')}。如需这些题型，请扩大章节范围。`);
    }

    onGenerate(config, selected);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn">
      <div className="text-center mb-5 lg:mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4">
          <FileText className="w-7 h-7 lg:w-8 lg:h-8 text-purple-400" />
        </div>
        <h2 className="text-lg lg:text-xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
          生成模拟套卷
        </h2>
        <p className="text-xs lg:text-sm text-slate-500 mt-1">自定义试卷参数，一键生成完整试卷</p>
      </div>

      {/* Title & Basic Info */}
      <div className="bg-[#1E293B] rounded-xl p-5 border border-white/5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-purple-400" />
          试卷基本信息
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">试卷名称</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">考试时长（分钟）</label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              min={30}
              max={300}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>
      </div>

      {/* Textbook Selection */}
      <div className="bg-[#1E293B] rounded-xl p-5 border border-white/5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          教材范围
        </h3>
        <div className="flex gap-2">
          {[
            { value: 'statistics' as const, label: '统计学' },
            { value: 'data-mining' as const, label: '数据挖掘' },
            { value: 'both' as const, label: '两本都考' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTextbook(opt.value)}
              className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${
                textbook === opt.value
                  ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                  : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type Distribution */}
      <div className="bg-[#1E293B] rounded-xl p-5 border border-white/5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-emerald-400" />
          题型分布（共 {totalQuestions} 题 · 总分 {totalScore} 分）
        </h3>
        {(['single', 'multiple', 'judge', 'short', 'case'] as QuestionType[]).map((type) => {
          const key = type as keyof typeof typeCounts;
          return (
            <div key={type} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-16 shrink-0">{QUESTION_TYPE_LABELS[type]}</span>
              <span className="text-[10px] text-slate-600 w-20 shrink-0">每题 {TYPE_SCORES[type]} 分</span>
              <input
                type="range"
                min={0}
                max={TYPE_MAX_COUNTS[type]}
                value={typeCounts[key]}
                onChange={(e) => setTypeCounts((prev) => ({ ...prev, [type]: Number(e.target.value) }))}
                className="flex-1"
              />
              <span className="text-xs text-white font-mono w-6 text-right">{typeCounts[key]}</span>
              <span className="text-[10px] text-emerald-400/70 font-mono w-10 text-right">
                {typeCounts[key] * TYPE_SCORES[type]}分
              </span>
            </div>
          );
        })}
      </div>

      {/* Difficulty Ratio */}
      <div className="bg-[#1E293B] rounded-xl p-5 border border-white/5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-blue-400" />
          难度分布
        </h3>
        {(['easy', 'medium', 'hard'] as const).map((level) => (
          <div key={level} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-16">
              {level === 'easy' ? '简单' : level === 'medium' ? '中等' : '困难'}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={difficulty[level]}
              onChange={(e) => {
                const val = Number(e.target.value);
                const others = (['easy', 'medium', 'hard'] as const).filter((l) => l !== level);
                const remaining = 100 - val;
                setDifficulty((prev) => {
                  const newRatio = { ...prev, [level]: val };
                  const ratio = prev[others[0]] / (prev[others[0]] + prev[others[1]] || 1);
                  newRatio[others[0]] = Math.round(remaining * ratio);
                  newRatio[others[1]] = remaining - newRatio[others[0]];
                  return newRatio;
                });
              }}
              className="flex-1"
            />
            <span className="text-xs text-white font-mono w-8 text-right">{difficulty[level]}%</span>
          </div>
        ))}
        <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
          <div className="bg-emerald-500/70 transition-all" style={{ width: `${difficulty.easy}%` }} />
          <div className="bg-amber-500/70 transition-all" style={{ width: `${difficulty.medium}%` }} />
          <div className="bg-red-500/70 transition-all" style={{ width: `${difficulty.hard}%` }} />
        </div>
      </div>

      {/* Chapters：与题库浏览一致的分组章节导航 */}
      <div className="bg-[#1E293B] rounded-xl p-5 border border-white/5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          章节范围 <span className="text-xs font-normal text-slate-500">（留空则全部章节）</span>
        </h3>
        <ChapterRangePicker
          value={chapterSel}
          onChange={setChapterSel}
          groups={
            textbook === 'statistics'
              ? ['stats', 'sq', 'guide']
              : textbook === 'data-mining'
                ? ['dm']
                : ['stats', 'dm', 'sq', 'guide']
          }
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={totalQuestions === 0}
        className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2"
      >
        <FileText className="w-5 h-5" />
        生成试卷
      </button>
    </div>
  );
}

function PreviewPanel({
  config,
  questions,
  onStart,
  onBack,
}: {
  config: ExamConfig;
  questions: ExamQuestion[];
  onStart: () => void;
  onBack: () => void;
}) {
  const groupedByType = useMemo(() => {
    const groups = new Map<QuestionType, ExamQuestion[]>();
    for (const q of questions) {
      const arr = groups.get(q.type) || [];
      arr.push(q);
      groups.set(q.type, arr);
    }
    return groups;
  }, [questions]);

  const totalScore = questions.reduce((s, q) => s + q.score, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>{config.title}</h2>
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {questions.length} 题
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {config.timeLimit} 分钟
          </span>
          <span>总分 {totalScore} 分</span>
        </div>
      </div>

      {/* Paper Content Preview */}
      <div className="bg-[#1E293B] rounded-xl border border-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-sm font-semibold text-white">试卷预览</h3>
        </div>
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {(['single', 'multiple', 'judge', 'short', 'case'] as QuestionType[]).map((type) => {
            const typeQuestions = groupedByType.get(type);
            if (!typeQuestions || typeQuestions.length === 0) return null;
            const typeScore = typeQuestions.reduce((s, q) => s + q.score, 0);

            return (
              <div key={type}>
                <h4 className="text-sm font-semibold text-amber-400 mb-3">
                  {QUESTION_TYPE_LABELS[type]}（共 {typeQuestions.length} 题，{typeScore} 分）
                </h4>
                <div className="space-y-2">
                  {typeQuestions.map((q) => (
                    <div key={q.id} className="flex gap-3 text-xs text-slate-400 py-1.5 border-b border-white/[0.03] last:border-0">
                      <span className="text-amber-500 font-medium shrink-0 w-8">{q.questionNumber}.</span>
                      <span className="leading-relaxed">
                        {q.stem.length > 60 ? q.stem.slice(0, 60) + '...' : q.stem}
                      </span>
                      <span className="text-slate-600 shrink-0 ml-auto">{q.score}分</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 bg-white/[0.05] hover:bg-white/[0.08] text-white font-medium rounded-lg transition-all text-sm"
        >
          返回修改
        </button>
        <button
          onClick={onStart}
          className="flex-1 py-3 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded-lg transition-all text-sm flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          开始考试
        </button>
      </div>
    </div>
  );
}

function AnsweringPanel({
  config,
  questions,
  onFinish,
  initialAnswers,
  initialTimeLeft,
}: {
  config: ExamConfig;
  questions: ExamQuestion[];
  onFinish: (answers: Map<string, string>, timeLeft: number) => void;
  initialAnswers?: Record<string, string>;
  initialTimeLeft?: number;
}) {
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(
    () => new Map(Object.entries(initialAnswers ?? {}))
  );
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft ?? config.timeLimit * 60);

  const sections = useMemo(() => {
    const sections: { type: QuestionType; questions: ExamQuestion[] }[] = [];
    const types: QuestionType[] = ['single', 'multiple', 'judge', 'short', 'case'];
    for (const type of types) {
      const qs = questions.filter((q) => q.type === type);
      if (qs.length > 0) sections.push({ type, questions: qs });
    }
    return sections;
  }, [questions]);

  // ---- 断点续答：作答即保存，剩余时间每 15 秒保存一次 ----
  const stateRef = useRef({ answers, timeLeft });
  stateRef.current = { answers, timeLeft };
  const persistDraft = useCallback(() => {
    try {
      saveExamDraft({
        config,
        questions: questions.map((q) => ({ id: q.id, score: q.score })),
        answers: Object.fromEntries(stateRef.current.answers),
        timeLeft: stateRef.current.timeLeft,
        savedAt: Date.now(),
      });
    } catch { /* 存储失败不影响考试 */ }
  }, [config, questions]);
  useEffect(() => { persistDraft(); }, [answers, persistDraft]);
  useEffect(() => { if (timeLeft > 0 && timeLeft % 15 === 0) persistDraft(); }, [timeLeft, persistDraft]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onFinish(answers, timeLeft);
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, answers, onFinish]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // 切换部分时重置滚动位置，避免停留在上一部分的位置导致内容错位
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 兼容老内核浏览器(如360极速旧版): scrollTo({top}) 对象参数可能不支持, 用 scrollTop 赋值
    if (listRef.current) listRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [currentSection]);

  const setAnswer = (qId: string, ans: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(qId, ans);
      return next;
    });
  };

  const answeredCount = questions.filter((q) => {
    const a = answers.get(q.id);
    return a && a.trim().length > 0;
  }).length;

  const currentSectionData = sections[currentSection];

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between bg-[#1E293B] rounded-xl p-3 lg:p-4 border border-white/5">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-white">{config.title}</h1>
          <div className="text-[10px] lg:text-xs text-slate-500">
            已答 <span className="text-emerald-400 font-medium">{answeredCount}</span>/{questions.length} 题
          </div>
        </div>
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Section tabs */}
          <div className="flex bg-white/[0.03] rounded-lg p-0.5 overflow-x-auto">
            {sections.map((sec, i) => {
              const secAnswered = sec.questions.filter((q) => {
                const a = answers.get(q.id);
                return a && a.trim().length > 0;
              }).length;
              return (
                <button
                  key={sec.type}
                  onClick={() => setCurrentSection(i)}
                  className={`px-2 lg:px-3 py-1.5 text-[10px] lg:text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    i === currentSection
                      ? 'bg-purple-500/30 text-purple-300'
                      : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  {QUESTION_TYPE_LABELS[sec.type]} ({secAnswered}/{sec.questions.length})
                </button>
              );
            })}
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${
            timeLeft < 300 ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-white/[0.03] text-slate-300'
          }`}>
            <Timer className="w-3.5 h-3.5" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Questions */}
      <div ref={listRef} className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
        <h3 className="text-sm font-semibold text-amber-400">
          {QUESTION_TYPE_LABELS[currentSectionData.type]}
        </h3>
        {currentSectionData.questions.map((q) => (
          <div key={q.id} className="bg-[#1E293B] rounded-xl p-5 border border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {q.questionNumber}
              </span>
              <span className="text-[10px] text-slate-600">({q.score}分)</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{q.stem}</p>

            {/* Options for objective types */}
            {q.options && (q.type === 'single' || q.type === 'multiple') && (
              <div className="space-y-1.5">
                {q.options.map((opt) => {
                  const optLetter = opt[0];
                  const isSelected = q.type === 'single'
                    ? answers.get(q.id) === optLetter
                    : (answers.get(q.id) || '').includes(optLetter);
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        if (q.type === 'single') {
                          setAnswer(q.id, optLetter);
                        } else {
                          const current = answers.get(q.id) || '';
                          setAnswer(
                            q.id,
                            current.includes(optLetter)
                              ? current.replace(optLetter, '')
                              : current + optLetter
                          );
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                        isSelected
                          ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                          : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-current text-[10px] font-bold mr-2">
                        {q.type === 'single' ? optLetter : (isSelected ? '✓' : optLetter)}
                      </span>
                      {opt.slice(3)}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === 'judge' && (
              <div className="flex gap-3">
                {['正确', '错误'].map((ans) => (
                  <button
                    key={ans}
                    onClick={() => setAnswer(q.id, ans)}
                    className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-all ${
                      answers.get(q.id) === ans
                        ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    {ans === '正确' ? <CheckCircle2 className="w-5 h-5 mx-auto mb-1" /> : <XCircle className="w-5 h-5 mx-auto mb-1" />}
                    {ans}
                  </button>
                ))}
              </div>
            )}

            {(q.type === 'short' || q.type === 'case') && (
              <textarea
                value={answers.get(q.id) || ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="请输入答案..."
                rows={q.type === 'case' ? 6 : 4}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 resize-none"
              />
            )}
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="flex justify-between pt-2">
        <button
          disabled={currentSection === 0}
          onClick={() => setCurrentSection((s) => s - 1)}
          className="px-5 py-2.5 bg-white/[0.03] text-slate-400 hover:text-white disabled:opacity-30 rounded-lg text-sm transition-all"
        >
          上一部分
        </button>
        {currentSection < sections.length - 1 ? (
          <button
            onClick={() => setCurrentSection((s) => s + 1)}
            className="px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-medium rounded-lg text-sm transition-all flex items-center gap-2"
          >
            下一部分
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => {
              if (answeredCount < questions.length) {
                const ok = window.confirm(`还有 ${questions.length - answeredCount} 题未作答，确定交卷吗？`);
                if (!ok) return;
              }
              onFinish(answers, timeLeft);
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#0B1121] font-bold rounded-lg text-sm transition-all"
          >
            交卷
          </button>
        )}
      </div>
    </div>
  );
}

// ==================== 试卷导出（HTML 文件下载） ====================

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 单题判分（与结果页判分逻辑一致）
export function gradeOne(q: ExamQuestion, userAnswer: string): { isCorrect: boolean; score: number } {
  let isCorrect = false;
  if (q.type === 'single' || q.type === 'judge') {
    isCorrect = userAnswer.trim() === q.correctAnswer.trim();
  } else if (q.type === 'multiple') {
    const userSorted = userAnswer.replace(/\s/g, '').toUpperCase().split('').sort().join('');
    const correctSorted = q.correctAnswer.replace(/\s/g, '').toUpperCase().split('').sort().join('');
    isCorrect = userSorted === correctSorted;
  } else {
    const userLower = userAnswer.toLowerCase();
    const correctLower = q.correctAnswer.toLowerCase();
    const keywords = correctLower.split(/[，,。.；;、\s]+/).filter((k) => k.length > 1);
    const matchCount = keywords.filter((k) => userLower.includes(k)).length;
    isCorrect = keywords.length > 0 && matchCount / keywords.length >= 0.5;
  }
  return { isCorrect, score: isCorrect ? q.score : 0 };
}

const TYPE_SECTION_TITLES: Record<QuestionType, string> = {
  single: '一、单项选择题',
  multiple: '二、多项选择题',
  judge: '三、判断题',
  short: '四、简答题',
  case: '五、案例分析题',
};

// 生成考试记录 HTML 并触发下载
export function exportExamRecordHtml(opts: {
  title: string;
  date: number;
  timeUsed?: number;
  questions: ExamQuestion[];
  answers: Record<string, string>;
}): void {
  const details = opts.questions.map((q) => {
    const userAnswer = opts.answers[q.id] || '';
    const { isCorrect, score } = gradeOne(q, userAnswer);
    return { q, userAnswer, isCorrect, score };
  });
  const totalScore = details.reduce((s, d) => s + d.q.score, 0);
  const earnedScore = details.reduce((s, d) => s + d.score, 0);
  const correctCount = details.filter((d) => d.isCorrect).length;
  const accuracy = totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : 0;
  const dateStr = new Date(opts.date).toLocaleString('zh-CN', { hour12: false });
  const timeStr = typeof opts.timeUsed === 'number' ? `${Math.floor(opts.timeUsed / 60)} 分钟` : '—';

  const typeOrder: QuestionType[] = ['single', 'multiple', 'judge', 'short', 'case'];
  const sectionsHtml = typeOrder
    .map((type) => {
      const items = details.filter((d) => d.q.type === type);
      if (items.length === 0) return '';
      const qs = items
        .map((d) => {
          const optionsHtml = d.q.options && d.q.options.length > 0
            ? `<ol class="options">${d.q.options.map((o) => `<li>${escapeHtml(o)}</li>`).join('')}</ol>`
            : '';
          return `<div class="q ${d.isCorrect ? 'ok' : 'no'}">
  <p class="stem"><span class="num">${d.q.questionNumber}.</span> ${escapeHtml(d.q.stem)} <span class="score">[${d.q.score}分]</span></p>
  ${optionsHtml}
  <p class="ans">你的答案：<b class="${d.isCorrect ? 'c' : 'w'}">${escapeHtml(d.userAnswer) || '（未作答）'}</b>　正确答案：<b class="c">${escapeHtml(d.q.correctAnswer)}</b>　得分：${d.score}/${d.q.score}</p>
  ${d.q.explanation ? `<p class="exp">解析：${escapeHtml(d.q.explanation)}</p>` : ''}
</div>`;
        })
        .join('\n');
      return `<h2>${TYPE_SECTION_TITLES[type]}（共 ${items.length} 题）</h2>\n${qs}`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${escapeHtml(opts.title)} - 考试记录</title>
<style>
  body { font-family: "Noto Serif SC", "Songti SC", "SimSun", serif; max-width: 800px; margin: 24px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }
  h1 { font-size: 22px; text-align: center; margin-bottom: 4px; }
  .meta { text-align: center; color: #555; font-size: 13px; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
  .meta b { color: #111; }
  h2 { font-size: 16px; margin: 22px 0 10px; border-left: 4px solid #333; padding-left: 8px; }
  .q { border: 1px solid #ddd; border-radius: 6px; padding: 12px 14px; margin-bottom: 10px; page-break-inside: avoid; }
  .q.no { border-left: 4px solid #c0392b; background: #fdf6f5; }
  .q.ok { border-left: 4px solid #27ae60; }
  .stem { margin: 0 0 6px; font-weight: 600; }
  .num { color: #555; }
  .score { color: #888; font-size: 12px; font-weight: 400; }
  .options { margin: 4px 0; padding-left: 22px; list-style: none; }
  .options li { margin: 2px 0; font-size: 14px; }
  .ans { font-size: 13px; margin: 6px 0 0; color: #444; }
  .c { color: #27ae60; } .w { color: #c0392b; }
  .exp { font-size: 13px; color: #555; background: #f5f5f0; border-radius: 4px; padding: 6px 10px; margin: 6px 0 0; }
  @media print { body { margin: 0; } .q { border: 1px solid #999; } }
</style>
</head>
<body>
<h1>${escapeHtml(opts.title)}</h1>
<p class="meta">考试时间：${dateStr}　·　用时：${timeStr}　·　得分：<b>${earnedScore}/${totalScore}</b>（正确率 ${accuracy}%）　·　答对 ${correctCount}/${details.length} 题</p>
${sectionsHtml}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date(opts.date);
  const pad = (n: number) => String(n).padStart(2, '0');
  a.href = url;
  a.download = `${opts.title.replace(/[\\/:*?"<>|]/g, '_')}-${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ResultPanel({
  config,
  questions,
  answers,
  onRetry,
  onExport,
}: {
  config: ExamConfig;
  questions: ExamQuestion[];
  answers: Map<string, string>;
  onRetry: () => void;
  onExport?: () => void;
}) {
  const navigate = useNavigate();

  const grading = useMemo(() => {
    let totalScore = 0;
    let earnedScore = 0;
    const details: { q: ExamQuestion; userAnswer: string; isCorrect: boolean; score: number }[] = [];

    for (const q of questions) {
      totalScore += q.score;
      const userAnswer = answers.get(q.id) || '';
      const { isCorrect, score } = gradeOne(q, userAnswer);
      earnedScore += score;
      details.push({ q, userAnswer, isCorrect, score });
    }

    return { totalScore, earnedScore, details };
  }, [questions, answers]);

  const accuracy = grading.totalScore > 0 ? Math.round((grading.earnedScore / grading.totalScore) * 100) : 0;

  // Section breakdown
  const sectionBreakdown = useMemo(() => {
    const types: QuestionType[] = ['single', 'multiple', 'judge', 'short', 'case'];
    return types.map((type) => {
      const typeQuestions = grading.details.filter((d) => d.q.type === type);
      if (typeQuestions.length === 0) return null;
      const typeTotal = typeQuestions.reduce((s, d) => s + d.q.score, 0);
      const typeEarned = typeQuestions.reduce((s, d) => s + d.score, 0);
      const correctCount = typeQuestions.filter((d) => d.isCorrect).length;
      return { type, label: QUESTION_TYPE_LABELS[type], total: typeTotal, earned: typeEarned, correct: correctCount, count: typeQuestions.length };
    }).filter(Boolean);
  }, [grading]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Score Hero */}
      <div className="text-center">
        <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>考试完成</h2>
        <p className="text-sm text-slate-500">{config.title}</p>
        <div className="mt-4 inline-flex items-baseline gap-2">
          <span className={`text-5xl font-bold ${accuracy >= 80 ? 'text-emerald-400' : accuracy >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {grading.earnedScore}
          </span>
          <span className="text-xl text-slate-500">/ {grading.totalScore} 分</span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          正确率 {accuracy}% · 答对 {grading.details.filter((d) => d.isCorrect).length}/{questions.length} 题
        </p>
      </div>

      {/* Score Ring */}
      <div className="flex justify-center">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none"
              stroke={accuracy >= 80 ? '#10B981' : accuracy >= 60 ? '#F59E0B' : '#EF4444'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(accuracy / 100) * 326.7} 326.7`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{accuracy}%</span>
          </div>
        </div>
      </div>

      {/* Section Breakdown */}
      {sectionBreakdown.length > 0 && (
        <div className="bg-[#1E293B] rounded-xl p-5 border border-white/5">
          <h3 className="text-sm font-semibold text-white mb-3">各题型得分</h3>
          <div className="space-y-2">
            {sectionBreakdown.map((s) => s && (
              <div key={s!.type} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-slate-400">{s!.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{s!.correct}/{s!.count}题</span>
                  <span className={`text-sm font-medium ${
                    s!.total > 0 && s!.earned / s!.total >= 0.7 ? 'text-emerald-400' :
                    s!.total > 0 && s!.earned / s!.total >= 0.4 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {s!.earned}/{s!.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 逐题解析：无论对错都显示 */}
      <div className="bg-[#1E293B] rounded-xl p-5 border border-white/5">
        <h3 className="text-sm font-semibold text-white mb-3">逐题解析</h3>
        <div className="space-y-3">
          {grading.details.map((d, i) => (
            <div
              key={d.q.id}
              className={`rounded-lg border p-4 space-y-2 ${
                d.isCorrect ? 'border-emerald-500/15 bg-emerald-500/[0.03]' : 'border-red-500/15 bg-red-500/[0.03]'
              }`}
            >
              <div className="flex items-start gap-2">
                {d.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <p className="text-sm text-slate-200 leading-relaxed">
                  <span className="text-slate-500 mr-1">{i + 1}.</span>
                  {d.q.stem}
                </p>
              </div>
              <div className="pl-6 text-xs space-y-1">
                <p className="text-slate-500">
                  你的答案：
                  <span className={d.isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                    {d.userAnswer || '（未作答）'}
                  </span>
                  {'　'}正确答案：<span className="text-emerald-400">{d.q.correctAnswer}</span>
                </p>
                {d.q.explanation && (
                  <p className="text-slate-400 leading-relaxed">
                    <span className="text-amber-400 font-medium">解析：</span>
                    {d.q.explanation}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onRetry} className="flex-1 py-3 bg-white/[0.05] hover:bg-white/[0.08] text-white font-medium rounded-lg transition-all text-sm flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" />再来一套
        </button>
        {onExport && (
          <button onClick={onExport} className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-medium rounded-lg transition-all text-sm flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />导出试卷
          </button>
        )}
        <button onClick={() => navigate('/weakness')} className="flex-1 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-medium rounded-lg transition-all text-sm flex items-center justify-center gap-2">
          <Lightbulb className="w-4 h-4" />查看薄弱分析
        </button>
      </div>
    </div>
  );
}

export default function ExamPaper() {
  const initialize = useExamStore((s) => s.initialize);
  const [phase, setPhase] = useState<ExamPhase>('config');
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [examAnswers, setExamAnswers] = useState<Map<string, string>>(new Map());
  const [draft, setDraft] = useState<ExamDraft | null>(() => loadExamDraft());
  const [resumeInit, setResumeInit] = useState<{ answers: Record<string, string>; timeLeft: number } | null>(null);
  const [records, setRecords] = useState<ExamRecord[]>(() => loadExamRecords());
  const [isReview, setIsReview] = useState(false); // 是否正在查看历史试卷记录
  const [exportMeta, setExportMeta] = useState<{ date: number; timeUsed?: number }>({ date: Date.now() }); // 当前结果页导出用的考试时间与用时

  useEffect(() => { initialize(); }, [initialize]);

  const handleGenerate = (config: ExamConfig, questions: ExamQuestion[]) => {
    setExamConfig(config);
    setExamQuestions(questions);
    setResumeInit(null);
    setPhase('preview');
  };

  const handleStartExam = () => {
    clearExamDraft(); // 新考试开始前清除旧草稿（作答后会重新保存）
    setDraft(null);
    setPhase('answering');
  };

  // 从断点草稿恢复考试
  const handleResumeDraft = () => {
    if (!draft) return;
    const qs: ExamQuestion[] = draft.questions
      .map((d, i) => {
        const q = getQuestionById(d.id);
        return q ? { ...q, score: d.score, questionNumber: i + 1 } : null;
      })
      .filter((q): q is ExamQuestion => !!q);
    if (qs.length === 0) {
      clearExamDraft();
      setDraft(null);
      return;
    }
    setExamConfig(draft.config as ExamConfig);
    setExamQuestions(qs);
    setResumeInit({ answers: draft.answers, timeLeft: draft.timeLeft });
    setDraft(null);
    setPhase('answering');
  };

  const handleDiscardDraft = () => {
    clearExamDraft();
    setDraft(null);
  };

  const handleFinish = (answers: Map<string, string>, timeLeft: number) => {
    clearExamDraft(); // 交卷后清除草稿
    if (examConfig) {
      // 判分、写入答题记录/错题本/掌握度/趋势，并保存试卷记录
      const timeUsed = Math.max(0, examConfig.timeLimit * 60 - Math.max(0, timeLeft));
      useExamStore.getState().finishExam({
        title: examConfig.title,
        questions: examQuestions.map((q) => ({ question: q, score: q.score, questionNumber: q.questionNumber })),
        answers: Object.fromEntries(answers),
        timeUsed,
      });
      setRecords(loadExamRecords());
      setExportMeta({ date: Date.now(), timeUsed });
    }
    setExamAnswers(answers);
    setIsReview(false);
    setPhase('result');
  };

  // 查看历史试卷记录（回顾逐题解析）
  const handleViewRecord = (record: ExamRecord) => {
    const qs: ExamQuestion[] = record.questions
      .map((d) => {
        const q = getQuestionById(d.id);
        return q ? { ...q, score: d.score, questionNumber: d.questionNumber } : null;
      })
      .filter((q): q is ExamQuestion => !!q);
    if (qs.length === 0) return;
    setExamConfig({
      title: record.title,
      textbook: 'both',
      chapters: [],
      typeDistribution: [],
      difficultyRatio: { easy: 0, medium: 0, hard: 0 },
      totalScore: record.totalScore,
      timeLimit: 0,
    });
    setExamQuestions(qs);
    setExamAnswers(new Map(Object.entries(record.answers)));
    setExportMeta({ date: record.timestamp, timeUsed: record.timeUsed });
    setIsReview(true);
    setPhase('result');
  };

  // 导出当前结果页展示的试卷（刚交卷或历史回顾）
  const handleExportCurrent = () => {
    if (!examConfig || examQuestions.length === 0) return;
    exportExamRecordHtml({
      title: examConfig.title,
      date: exportMeta.date,
      timeUsed: exportMeta.timeUsed,
      questions: examQuestions,
      answers: Object.fromEntries(examAnswers),
    });
  };

  // 从历史记录列表直接导出某套试卷
  const handleExportRecord = (record: ExamRecord) => {
    const qs: ExamQuestion[] = record.questions
      .map((d) => {
        const q = getQuestionById(d.id);
        return q ? { ...q, score: d.score, questionNumber: d.questionNumber } : null;
      })
      .filter((q): q is ExamQuestion => !!q);
    if (qs.length === 0) {
      window.alert('该记录中的题目已无法从题库找回，无法导出');
      return;
    }
    exportExamRecordHtml({
      title: record.title,
      date: record.timestamp,
      timeUsed: record.timeUsed,
      questions: qs,
      answers: record.answers,
    });
  };

  const handleDeleteRecord = (id: string) => {
    if (!window.confirm('确定删除这条试卷记录吗？')) return;
    setRecords(deleteExamRecord(id));
  };

  const handleRetry = () => {
    setExamConfig(null);
    setExamQuestions([]);
    setExamAnswers(new Map());
    setResumeInit(null);
    setIsReview(false);
    setRecords(loadExamRecords());
    setDraft(loadExamDraft()); // 正常为 null（交卷时已清除）
    setPhase('config');
  };

  return (
    <div className="space-y-4">
      {phase === 'config' && (
        <>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>套卷生成</h1>
            <p className="text-xs lg:text-sm text-slate-500 mt-1">自定义试卷参数，一键生成完整模拟试卷</p>
          </div>
          <ConfigPanel onGenerate={handleGenerate} />
          {/* 断点续考提示 */}
          {draft && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-purple-300">检测到未完成的考试</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  已答 {Object.keys(draft.answers).length}/{draft.questions.length} 题 · 剩余 {Math.floor(draft.timeLeft / 60)} 分钟 · 保存于 {new Date(draft.savedAt).toLocaleString('zh-CN', { hour12: false })}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleResumeDraft}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  继续考试
                </button>
                <button
                  onClick={handleDiscardDraft}
                  className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 text-sm rounded-lg transition-colors"
                >
                  放弃
                </button>
              </div>
            </div>
          )}
          {/* 历史试卷记录 */}
          {records.length > 0 && (
            <div className="max-w-2xl mx-auto bg-[#1E293B] rounded-xl border border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">历史试卷</h3>
                <span className="text-[10px] text-slate-500">（{records.length} 套 · 点击查看逐题解析，复习错题）</span>
              </div>
              <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                {records.map((r) => {
                  const pct = r.totalScore > 0 ? Math.round((r.earnedScore / r.totalScore) * 100) : 0;
                  const min = Math.floor(r.timeUsed / 60);
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-200 truncate">{r.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(r.timestamp).toLocaleString('zh-CN', { hour12: false })} · {r.questionCount} 题 · 答对 {r.correctCount} 题 · 用时 {min} 分钟
                        </div>
                      </div>
                      <span className={`text-sm font-bold font-mono shrink-0 ${
                        pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {r.earnedScore}<span className="text-[10px] text-slate-500 font-normal">/{r.totalScore}</span>
                      </span>
                      <button
                        onClick={() => handleViewRecord(r)}
                        className="shrink-0 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-xs font-medium rounded-lg transition-colors"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => handleExportRecord(r)}
                        className="shrink-0 p-1.5 text-slate-600 hover:text-emerald-400 transition-colors"
                        title="导出试卷到本地"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(r.id)}
                        className="shrink-0 p-1.5 text-slate-600 hover:text-red-400 transition-colors"
                        title="删除记录"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {phase === 'preview' && examConfig && (
        <>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>试卷预览</h1>
          </div>
          <PreviewPanel config={examConfig} questions={examQuestions} onStart={handleStartExam} onBack={() => setPhase('config')} />
        </>
      )}

      {phase === 'answering' && examConfig && (
        <AnsweringPanel
          config={examConfig}
          questions={examQuestions}
          onFinish={handleFinish}
          initialAnswers={resumeInit?.answers}
          initialTimeLeft={resumeInit?.timeLeft}
        />
      )}

      {phase === 'result' && examConfig && (
        <>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
              {isReview ? '试卷回顾' : '考试成绩'}
            </h1>
            {isReview && (
              <p className="text-xs text-slate-500 mt-1">历史试卷记录 · 错题已同步至错题本，可前往复习</p>
            )}
          </div>
          <ResultPanel config={examConfig} questions={examQuestions} answers={examAnswers} onRetry={handleRetry} onExport={handleExportCurrent} />
        </>
      )}
    </div>
  );
}
