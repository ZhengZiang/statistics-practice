import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../stores/examStore';
import { getQuestionById } from '../data/questions';
import { selectAdaptiveQuestions, selectRandomQuestions } from '../utils/questionSelector';
import { loadPracticeDraft, clearPracticeDraft, type PracticeDraft } from '../utils/storage';
import ChapterRangePicker, { type ChapterSelection } from '../components/ChapterRangePicker';
import type { QuestionType, PracticeConfig, BankFilter } from '../types';
import { QUESTION_TYPE_LABELS, QUESTION_BANK_LABELS } from '../types';
import {
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Settings2,
  Lightbulb,
  Timer,
  Trophy,
  Brain,
  ArrowRight,
  Filter,
  BookOpen,
  Library,
  TrendingUp,
} from 'lucide-react';

type Phase = 'config' | 'answering' | 'result';

function ConfigPanel({ onStart }: { onStart: (config: PracticeConfig) => void }) {
  const masteryData = useExamStore((s) => s.masteryData);
  const [types, setTypes] = useState<QuestionType[]>(['single', 'multiple', 'judge']);
  const [chapterSel, setChapterSel] = useState<ChapterSelection>({ original: [], screened: [], guide: [] });
  const [questionCount, setQuestionCount] = useState(10);
  const [adaptiveMode, setAdaptiveMode] = useState(true);
  const [bank, setBank] = useState<BankFilter>('all');

  const allTypes: QuestionType[] = ['single', 'multiple', 'judge', 'short', 'case'];

  const handleBankChange = (b: BankFilter) => {
    setBank(b);
    // 换库后清掉不属于该库的章节选择
    setChapterSel((prev) => ({
      original: b === 'screened' || b === 'guide' ? [] : prev.original,
      screened: b === 'original' || b === 'guide' ? [] : prev.screened,
      guide: b === 'original' || b === 'screened' ? [] : prev.guide,
    }));
  };

  const toggleType = (t: QuestionType) => {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleStart = () => {
    onStart({
      types,
      chapters: chapterSel.original,
      screenedChapters: chapterSel.screened,
      guideChapters: chapterSel.guide,
      knowledgePoints: [],
      questionCount,
      adaptiveMode,
      bank,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="text-center mb-6 lg:mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
          <Brain className="w-7 h-7 lg:w-8 lg:h-8 text-amber-400" />
        </div>
        <h2 className="text-lg lg:text-xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
          配置你的练习
        </h2>
        <p className="text-xs lg:text-sm text-slate-500 mt-1">选择题型、范围和数量，开启针对性练习</p>
      </div>

      {/* Adaptive toggle */}
      <div className="bg-[#1E293B] rounded-xl p-5 border border-white/5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          练习模式
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setAdaptiveMode(true)}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              adaptiveMode
                ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Brain className="w-4 h-4 inline mr-2" />
            自适应模式
          </button>
          <button
            onClick={() => setAdaptiveMode(false)}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              !adaptiveMode
                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Filter className="w-4 h-4 inline mr-2" />
            随机模式
          </button>
        </div>
        {adaptiveMode && (
          <p className="text-xs text-slate-500">
            基于你的薄弱知识点，智能生成针对性练习题，60%来自薄弱点，30%巩固，10%复习
          </p>
        )}
      </div>

      {/* Question Bank */}
      <div className="bg-[#1E293B] rounded-xl p-5 border border-white/5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Library className="w-4 h-4 text-cyan-400" />
          题库选择
        </h3>
        <div className="flex gap-2">
          {(['all', 'original', 'screened', 'guide'] as BankFilter[]).map((b) => (
            <button
              key={b}
              onClick={() => handleBankChange(b)}
              className={`flex-1 py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                bank === b
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                  : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:text-slate-300'
              }`}
            >
              {QUESTION_BANK_LABELS[b]}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {bank === 'screened'
            ? '《统计学（第9版）》竞赛筛选题库，410 题'
            : bank === 'original'
              ? '系统内置题库'
              : bank === 'guide'
                ? '《统计学（第9版）学习指导书》原题'
                : '系统题库 + 竞赛筛选题库 + 指导书原题'}
        </p>
      </div>

      {/* Question Types */}
      <div className="bg-[#1E293B] rounded-xl p-5 border border-white/5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-400" />
          题型选择
        </h3>
        <div className="flex flex-wrap gap-2">
          {allTypes.map((t) => {
            const isSelected = types.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                    : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:text-slate-300 hover:border-white/10'
                }`}
              >
                {QUESTION_TYPE_LABELS[t]}
              </button>
            );
          })}
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
          groups={bank === 'screened' ? ['sq'] : bank === 'original' ? ['stats', 'dm'] : bank === 'guide' ? ['guide'] : ['stats', 'dm', 'sq', 'guide']}
        />
      </div>

      {/* Question Count */}
      <div className="bg-[#1E293B] rounded-xl p-5 border border-white/5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-emerald-400" />
          题目数量：<span className="text-amber-400">{questionCount} 题</span>
        </h3>
        <input
          type="range"
          min={5}
          max={30}
          step={5}
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>5题</span>
          <span>30题</span>
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={types.length === 0}
        className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-[#0B1121] font-bold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 flex items-center justify-center gap-2"
      >
        <Play className="w-5 h-5" />
        开始练习
      </button>
    </div>
  );
}

function AnsweringPhase() {
  const currentQuestion = useExamStore((s) => s.getCurrentQuestion());
  const submitAnswer = useExamStore((s) => s.submitAnswer);
  const nextQuestion = useExamStore((s) => s.nextQuestion);
  const finishPractice = useExamStore((s) => s.finishPractice);
  const getSessionProgress = useExamStore((s) => s.getSessionProgress);
  const session = useExamStore((s) => s.currentSession);
  const navigate = useNavigate();

  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - session.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);

  // Reset on question change
  useEffect(() => {
    setUserAnswer('');
    setSelectedOptions([]);
    setSubmitted(false);
    setShowExplanation(false);
  }, [currentQuestion?.id]);

  if (!currentQuestion) return null;

  const progress = getSessionProgress();
  const isLastQuestion = progress.current >= progress.total;

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    const answer = currentQuestion.type === 'multiple'
      ? selectedOptions.join('')
      : userAnswer;
    if (!answer.trim()) return;

    submitAnswer(currentQuestion.id, answer);
    setSubmitted(true);
    setShowExplanation(true); // 无论对错都显示解析
  };

  const handleNext = () => {
    if (isLastQuestion) {
      finishPractice();
    } else {
      nextQuestion();
    }
  };

  const typeLabel = QUESTION_TYPE_LABELS[currentQuestion.type];
  const typeColor = {
    single: 'text-blue-400',
    multiple: 'text-purple-400',
    judge: 'text-emerald-400',
    short: 'text-amber-400',
    case: 'text-rose-400',
  }[currentQuestion.type];

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fadeIn">
      {/* Progress bar */}
      <div className="flex items-center gap-2 lg:gap-4 mb-2">
        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
        <span className="text-[10px] lg:text-xs text-slate-500 font-medium tabular-nums whitespace-nowrap">
          {progress.current}/{progress.total}
        </span>
        <span className="flex items-center gap-1 text-[10px] lg:text-xs text-slate-500">
          <Timer className="w-3 h-3" />
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Question Card */}
      <div className="bg-[#1E293B] rounded-xl p-6 border border-white/5 space-y-5">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
            currentQuestion.type === 'single' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
            currentQuestion.type === 'multiple' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
            currentQuestion.type === 'judge' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
            currentQuestion.type === 'short' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
            'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {typeLabel}
          </span>
          <span className="text-[10px] text-slate-600 px-2 py-0.5 bg-white/[0.02] rounded">
            {currentQuestion.chapter}
          </span>
        </div>

        <div>
          <p className="text-base text-slate-100 leading-relaxed">{currentQuestion.stem}</p>
        </div>

        {/* Options / Answer Area */}
        {currentQuestion.type === 'single' && currentQuestion.options && (
          <div className="space-y-2.5">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt}
                disabled={submitted}
                onClick={() => setUserAnswer(opt[0])}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                  userAnswer === opt[0]
                    ? submitted
                      ? userAnswer === currentQuestion.correctAnswer[0]
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/40 text-red-300'
                      : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                    : submitted && opt[0] === currentQuestion.correctAnswer[0]
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.04] hover:text-slate-300'
                }`}
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-current text-xs font-bold mr-3">
                  {opt[0]}
                </span>
                {opt.slice(3)}
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === 'multiple' && currentQuestion.options && (
          <div className="space-y-2.5">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedOptions.includes(opt[0]);
              return (
                <button
                  key={opt}
                  disabled={submitted}
                  onClick={() => {
                    setSelectedOptions((prev) =>
                      prev.includes(opt[0])
                        ? prev.filter((x) => x !== opt[0])
                        : [...prev, opt[0]]
                    );
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                    isSelected
                      ? submitted
                        ? currentQuestion.correctAnswer.includes(opt[0])
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/40 text-red-300'
                        : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      : submitted && currentQuestion.correctAnswer.includes(opt[0])
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.04] hover:text-slate-300'
                  }`}
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded border border-current text-xs font-bold mr-3">
                    {isSelected ? '✓' : opt[0]}
                  </span>
                  {opt.slice(3)}
                </button>
              );
            })}
          </div>
        )}

        {currentQuestion.type === 'judge' && (
          <div className="flex gap-3">
            {['正确', '错误'].map((ans) => (
              <button
                key={ans}
                disabled={submitted}
                onClick={() => setUserAnswer(ans)}
                className={`flex-1 py-4 rounded-lg border text-sm font-medium transition-all ${
                  userAnswer === ans
                    ? submitted
                      ? userAnswer === currentQuestion.correctAnswer
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/40 text-red-300'
                      : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                    : submitted && ans === currentQuestion.correctAnswer
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.04]'
                }`}
              >
                {ans === '正确' ? <CheckCircle2 className="w-6 h-6 mx-auto mb-1" /> : <XCircle className="w-6 h-6 mx-auto mb-1" />}
                {ans}
              </button>
            ))}
          </div>
        )}

        {(currentQuestion.type === 'short' || currentQuestion.type === 'case') && (
          <textarea
            disabled={submitted}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="请输入你的答案..."
            rows={6}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
          />
        )}

        {/* Feedback + Explanation：无论对错都显示 */}
        {submitted && showExplanation && (() => {
          const lastAnswer = session.answers[session.answers.length - 1];
          const isCorrect = lastAnswer?.questionId === currentQuestion.id && lastAnswer.isCorrect;
          return (
            <div className={`rounded-lg p-4 space-y-2 border ${
              isCorrect
                ? 'bg-emerald-500/5 border-emerald-500/15'
                : 'bg-amber-500/5 border-amber-500/15'
            }`}>
              <div className={`flex items-center gap-2 text-xs font-semibold ${
                isCorrect ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
                {isCorrect ? '回答正确 · 答案解析' : '答案解析'}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{currentQuestion.explanation}</p>
              <div className="text-xs text-slate-500">
                正确答案：<span className="text-emerald-400 font-medium">{currentQuestion.correctAnswer}</span>
              </div>
            </div>
          );
        })()}

        {/* Feedback */}
        {submitted && !showExplanation && (
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-300">回答正确！</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={(!userAnswer.trim() && selectedOptions.length === 0)}
            className="ml-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-[#0B1121] font-semibold rounded-lg transition-all text-sm"
          >
            提交答案
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="ml-auto px-6 py-3 bg-white/[0.05] hover:bg-white/[0.08] text-white font-semibold rounded-lg transition-all text-sm flex items-center gap-2"
          >
            {isLastQuestion ? '查看结果' : '下一题'}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function ResultPhase({ onRetry }: { onRetry: () => void }) {
  const navigate = useNavigate();
  const session = useExamStore((s) => s.currentSession);
  const correctCount = session.answers.filter((a) => a.isCorrect).length;
  const score = session.questions.length > 0
    ? Math.round((correctCount / session.questions.length) * 100)
    : 0;

  // Type breakdown
  const typeBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; correct: number }>();
    for (const a of session.answers) {
      const q = getQuestionById(a.questionId);
      if (!q) continue;
      const entry = map.get(q.type) || { total: 0, correct: 0 };
      entry.total++;
      if (a.isCorrect) entry.correct++;
      map.set(q.type, entry);
    }
    return Array.from(map.entries()).map(([type, data]) => ({
      type,
      label: QUESTION_TYPE_LABELS[type as QuestionType],
      ...data,
    }));
  }, [session.answers]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Score Hero */}
      <div className="text-center">
        <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-3" />
        <h2 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>练习完成!</h2>
        <div className="mt-4 inline-flex items-baseline gap-2">
          <span className={`text-5xl font-bold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {score}
          </span>
          <span className="text-xl text-slate-500">分</span>
        </div>
        <p className="text-sm text-slate-400 mt-2">
          答对 {correctCount}/{session.questions.length} 题，正确率 {score}%
        </p>
      </div>

      {/* Score Ring */}
      <div className="flex justify-center">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 326.7} 326.7`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{score}%</span>
          </div>
        </div>
      </div>

      {/* Type Breakdown */}
      {typeBreakdown.length > 0 && (
        <div className="bg-[#1E293B] rounded-xl p-5 border border-white/5">
          <h3 className="text-sm font-semibold text-white mb-3">各题型表现</h3>
          <div className="space-y-2">
            {typeBreakdown.map((t) => (
              <div key={t.type} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-slate-400">{t.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{t.correct}/{t.total}</span>
                  <span className={`text-sm font-medium ${
                    t.total > 0 && t.correct / t.total >= 0.7 ? 'text-emerald-400' :
                    t.total > 0 && t.correct / t.total >= 0.4 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex-1 py-3 bg-white/[0.05] hover:bg-white/[0.08] text-white font-medium rounded-lg transition-all text-sm flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          再来一组
        </button>
        <button
          onClick={() => navigate('/weakness')}
          className="flex-1 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-medium rounded-lg transition-all text-sm flex items-center justify-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          查看薄弱分析
        </button>
      </div>
    </div>
  );
}

export default function Practice() {
  const initialize = useExamStore((s) => s.initialize);
  const startPractice = useExamStore((s) => s.startPractice);
  const resumePractice = useExamStore((s) => s.resumePractice);
  const masteryData = useExamStore((s) => s.masteryData);
  const session = useExamStore((s) => s.currentSession);

  const [phase, setPhase] = useState<Phase>('config');
  const [draft, setDraft] = useState<PracticeDraft | null>(() => loadPracticeDraft());

  const handleResumeDraft = () => {
    if (!draft) return;
    resumePractice(draft);
    setDraft(null);
    const s = useExamStore.getState().currentSession;
    setPhase(s.isFinished ? 'result' : 'answering');
  };
  const handleDiscardDraft = () => {
    clearPracticeDraft();
    setDraft(null);
  };

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (session.questions.length > 0 && !session.isFinished) {
      setPhase('answering');
    }
  }, [session.questions.length]);

  const handleStart = (config: PracticeConfig) => {
    const questions = config.adaptiveMode
      ? selectAdaptiveQuestions(config.questionCount, masteryData, config)
      : selectRandomQuestions(config.questionCount, config);
    startPractice(config, questions);
  };

  const handleRetry = () => {
    setPhase('config');
    setDraft(loadPracticeDraft()); // 完成后草稿已清除，正常为 null
  };

  // Check if we're in answering phase and questions exist
  if (phase === 'answering' && session.questions.length > 0 && !session.isFinished) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>练习中</h1>
          </div>
          <button
            onClick={() => {
              const result = useExamStore.getState().finishPractice();
              setPhase('result');
            }}
            className="px-4 py-2 text-xs bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 rounded-lg transition-all border border-white/5"
          >
            结束练习
          </button>
        </div>
        <AnsweringPhase />
      </div>
    );
  }

  // Check if we just finished
  if (session.isFinished && session.answers.length > 0 && phase !== 'config') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>练习结果</h1>
        </div>
        <ResultPhase onRetry={handleRetry} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg lg:text-xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>练习中心</h1>
        <p className="text-xs lg:text-sm text-slate-500 mt-1">选择练习参数，开始针对性训练</p>
      </div>
      {/* 断点续答提示 */}
      {draft && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-300">检测到未完成的练习</div>
            <div className="text-xs text-slate-400 mt-0.5">
              已答 {draft.answers.length}/{draft.questionIds.length} 题 · 保存于 {new Date(draft.savedAt).toLocaleString('zh-CN', { hour12: false })}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleResumeDraft}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-[#0B1121] text-sm font-semibold rounded-lg transition-colors"
            >
              继续练习
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
      <ConfigPanel onStart={handleStart} />
    </div>
  );
}


