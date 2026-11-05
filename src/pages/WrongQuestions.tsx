import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../stores/examStore';
import { getQuestionById, questionBank } from '../data/questions';
import { QUESTION_TYPE_LABELS } from '../types';
import type { QuestionType } from '../types';
import {
  AlertTriangle,
  Trash2,
  Eye,
  RotateCcw,
  Filter,
  Search,
  ChevronDown,
  Lightbulb,
  CheckCircle2,
  XCircle,
  BookOpen,
} from 'lucide-react';

export default function WrongQuestions() {
  const navigate = useNavigate();
  const initialize = useExamStore((s) => s.initialize);
  const wrongQuestions = useExamStore((s) => s.wrongQuestions);
  const removeWrongQuestion = useExamStore((s) => s.removeWrongQuestion);
  const markWrongReviewed = useExamStore((s) => s.markWrongReviewed);

  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const filtered = useMemo(() => {
    let list = [...wrongQuestions].sort((a, b) => b.timestamp - a.timestamp);
    if (filterType !== 'all') {
      list = list.filter((wq) => {
        const q = getQuestionById(wq.questionId);
        return q?.type === filterType;
      });
    }
    return list;
  }, [wrongQuestions, filterType]);

  const chapters = [...new Set(questionBank.map((q) => q.chapter))];

  if (wrongQuestions.length === 0) {
    return (
      <div className="animate-fadeIn space-y-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>错题本</h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">你的错题都会被自动收集到这里</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 lg:py-20 text-center">
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 lg:mb-5">
            <CheckCircle2 className="w-8 h-8 lg:w-10 lg:h-10 text-emerald-400" />
          </div>
          <h3 className="text-base lg:text-lg font-semibold text-white mb-2">暂无错题</h3>
          <p className="text-xs lg:text-sm text-slate-500 max-w-md px-4">
            太棒了！你目前没有任何错题记录。继续保持，或者去练习中心开始新的练习。
          </p>
          <button
            onClick={() => navigate('/practice')}
            className="mt-6 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-[#0B1121] font-semibold rounded-lg transition-all text-sm"
          >
            去练习
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>错题本</h1>
        <p className="text-xs lg:text-sm text-slate-500 mt-1">
          共 {wrongQuestions.length} 道错题，{wrongQuestions.filter((w) => !w.isReviewed).length} 道待复习
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#1E293B] rounded-lg px-3 py-2 border border-white/5">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-transparent text-sm text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">全部题型</option>
            {(['single', 'multiple', 'judge', 'short', 'case'] as QuestionType[]).map((t) => (
              <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-600">
          显示 {filtered.length} 道
        </div>
      </div>

      {/* Wrong Questions List */}
      <div className="space-y-3">
        {filtered.map((wq) => {
          const question = getQuestionById(wq.questionId);
          const isExpanded = expandedId === wq.questionId;
          const date = new Date(wq.timestamp);
          const dateStr = `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

          // If question data not found, show a minimal card with available info
          if (!question) {
            return (
              <div
                key={wq.id}
                className="bg-[#1E293B] rounded-xl border border-red-500/20"
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-red-500/10 border-red-500/30 text-red-400">
                        未知题型
                      </span>
                      {!wq.isReviewed && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">待复习</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">题目数据异常（ID: {wq.questionId}），你的答案：{wq.wrongAnswer || '(空)'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">{dateStr}</span>
                    <button
                      onClick={() => {
                        removeWrongQuestion(wq.questionId);
                      }}
                      className="px-3 py-1.5 bg-white/[0.03] hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-slate-400 hover:text-red-400 rounded-lg text-xs font-medium transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                      移除
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={wq.id}
              className={`bg-[#1E293B] rounded-xl border transition-all ${
                isExpanded ? 'border-amber-500/20' : 'border-white/5 hover:border-white/10'
              }`}
            >
              {/* Header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : wq.questionId)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      question.type === 'single'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : question.type === 'multiple'
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                        : question.type === 'judge'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : question.type === 'short'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      {QUESTION_TYPE_LABELS[question.type]}
                    </span>
                    <span className="text-[10px] text-slate-600">{question.chapter}</span>
                    {!wq.isReviewed && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">待复习</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 truncate">{question.stem}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">{dateStr}</span>
                  <span className="text-xs text-slate-500">重做{wq.retryCount}次</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
                  {/* Full question */}
                  <div className="space-y-3">
                    <p className="text-sm text-slate-100 leading-relaxed">{question.stem}</p>

                    {/* Options */}
                    {question.options && (
                      <div className="space-y-1.5">
                        {question.options.map((opt) => {
                          const optLetter = opt[0];
                          const isCorrectOpt = question.correctAnswer.includes(optLetter);
                          const isWrongUser = wq.wrongAnswer.includes(optLetter);
                          return (
                            <div
                              key={opt}
                              className={`px-3 py-2 rounded-lg text-xs border ${
                                isCorrectOpt
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : isWrongUser
                                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                  : 'bg-white/[0.02] border-white/5 text-slate-500'
                              }`}
                            >
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold mr-2 ${
                                isCorrectOpt ? 'bg-emerald-500/20 text-emerald-300' : isWrongUser ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-slate-500'
                              }`}>
                                {optLetter}
                              </span>
                              {opt.slice(3)}
                              {isCorrectOpt && <CheckCircle2 className="w-3 h-3 text-emerald-400 inline ml-2" />}
                              {isWrongUser && !isCorrectOpt && <XCircle className="w-3 h-3 text-red-400 inline ml-2" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Answer comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3">
                      <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3">
                        <div className="text-[10px] text-red-400 font-semibold mb-1">你的答案</div>
                        <div className="text-sm text-red-300">{wq.wrongAnswer || '(空)'}</div>
                      </div>
                      <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3">
                        <div className="text-[10px] text-emerald-400 font-semibold mb-1">正确答案</div>
                        <div className="text-sm text-emerald-300">{question.correctAnswer}</div>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-2">
                        <Lightbulb className="w-3.5 h-3.5" />
                        答案解析
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{question.explanation}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => markWrongReviewed(wq.questionId)}
                      className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />
                      标记为已复习
                    </button>
                    <button
                      onClick={() => {
                        removeWrongQuestion(wq.questionId);
                        setExpandedId(null);
                      }}
                      className="px-4 py-2 bg-white/[0.03] hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-slate-400 hover:text-red-400 rounded-lg text-xs font-medium transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline mr-1.5" />
                      移除
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
