import { useState, useMemo, useEffect } from 'react';
import { allQuestions } from '../data/questions';
import { QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '../types';
import type { QuestionType, Difficulty } from '../types';
import {
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  BookOpen,
  Database,
  Hash,
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export default function QuestionBank() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterChapter, setFilterChapter] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBank, setFilterBank] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 按章节数字排序，避免字符串排序把"第10章"排到"第1章"后面
  const byChapterNo = (a: string, b: string) => {
    const na = parseInt(a.match(/第(\d+)章/)?.[1] ?? '999', 10);
    const nb = parseInt(b.match(/第(\d+)章/)?.[1] ?? '999', 10);
    return na - nb || a.localeCompare(b, 'zh');
  };

  // 系统题库章节按教材拆分：统计学 / 数据挖掘
  const statsChapters = useMemo(
    () => [...new Set(allQuestions.filter((q) => (q.bank ?? 'original') === 'original' && q.category === 'statistics').map((q) => q.chapter))].sort(byChapterNo),
    []
  );
  const dmChapters = useMemo(
    () => [...new Set(allQuestions.filter((q) => (q.bank ?? 'original') === 'original' && q.category === 'data-mining').map((q) => q.chapter))].sort(byChapterNo),
    []
  );
  const sqChapters = useMemo(
    () => [...new Set(allQuestions.filter((q) => q.bank === 'screened').map((q) => q.chapter))].sort(byChapterNo),
    []
  );
  const guideChapters = useMemo(
    () => [...new Set(allQuestions.filter((q) => q.bank === 'guide').map((q) => q.chapter))].sort(byChapterNo),
    []
  );

  const filtered = useMemo(() => {
    let list = [...allQuestions];

    if (search.trim()) {
      const keyword = search.toLowerCase();
      list = list.filter(
        (q) =>
          q.stem.toLowerCase().includes(keyword) ||
          q.explanation.toLowerCase().includes(keyword) ||
          q.chapter.toLowerCase().includes(keyword)
      );
    }

    if (filterType !== 'all') list = list.filter((q) => q.type === filterType);
    if (filterDifficulty !== 'all') list = list.filter((q) => q.difficulty === filterDifficulty);
    if (filterChapter !== 'all') list = list.filter((q) => q.chapter === filterChapter);
    if (filterCategory === 'statistics') list = list.filter((q) => q.category === 'statistics');
    if (filterCategory === 'data-mining') list = list.filter((q) => q.category === 'data-mining');
    if (filterBank !== 'all') list = list.filter((q) => (q.bank ?? 'original') === filterBank);

    return list;
  }, [search, filterType, filterDifficulty, filterChapter, filterCategory, filterBank]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterType, filterDifficulty, filterChapter, filterCategory, filterBank]);

  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setFilterDifficulty('all');
    setFilterChapter('all');
    setFilterCategory('all');
    setFilterBank('all');
  };

  const hasActiveFilters =
    search || filterType !== 'all' || filterDifficulty !== 'all' || filterChapter !== 'all' || filterCategory !== 'all' || filterBank !== 'all';

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
            题库浏览
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            共 {allQuestions.length} 道题目，当前筛选 {filtered.length} 道
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-[#1E293B] rounded-xl p-3 lg:p-4 border border-white/5 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="flex-1 min-w-0 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索题目、知识点、解析..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">全部题型</option>
            {(['single', 'multiple', 'judge', 'short', 'case'] as QuestionType[]).map((t) => (
              <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
            ))}
          </select>

          {/* Difficulty filter */}
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">全部难度</option>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">全部教材</option>
            <option value="statistics">统计学</option>
            <option value="data-mining">数据挖掘</option>
          </select>

          {/* Bank filter */}
          <select
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">全部题库</option>
            <option value="original">系统题库</option>
            <option value="screened">竞赛筛选题库</option>
            <option value="guide">指导书原题</option>
          </select>
        </div>

        {/* Chapter filter：系统题库-统计学章节 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-amber-500/80 mr-1 shrink-0">统计学：</span>
          <button
            onClick={() => { setFilterChapter('all'); setFilterBank('all'); }}
            className={`px-2 py-0.5 rounded text-[10px] transition-all ${
              filterChapter === 'all'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-white/[0.02] text-slate-500 hover:text-slate-400'
            }`}
          >
            全部
          </button>
          {statsChapters.map((ch) => (
            <button
              key={ch}
              onClick={() => { setFilterChapter(ch); setFilterBank('original'); }}
              className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                filterChapter === ch && filterBank === 'original'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-amber-500/[0.04] text-amber-400/60 hover:text-amber-300 border border-amber-500/10'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        {/* Chapter filter：系统题库-数据挖掘章节 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-violet-400/80 mr-1 shrink-0">数据挖掘：</span>
          {dmChapters.map((ch) => (
            <button
              key={ch}
              onClick={() => { setFilterChapter(ch); setFilterBank('original'); }}
              className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                filterChapter === ch && filterBank === 'original'
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'bg-violet-500/[0.04] text-violet-400/60 hover:text-violet-300 border border-violet-500/10'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        {/* Chapter filter：竞赛筛选题库（sq 题目）章节 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-cyan-500 mr-1 shrink-0">统计学竞赛题：</span>
          {sqChapters.map((ch) => (
            <button
              key={`sq-${ch}`}
              onClick={() => { setFilterChapter(ch); setFilterBank('screened'); }}
              className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                filterChapter === ch && filterBank === 'screened'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-cyan-500/[0.04] text-cyan-600 hover:text-cyan-400 border border-cyan-500/10'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        {/* Chapter filter：指导书原题（gq 题目）章节 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-emerald-500 mr-1 shrink-0">指导书原题：</span>
          {guideChapters.map((ch) => (
            <button
              key={`gq-${ch}`}
              onClick={() => { setFilterChapter(ch); setFilterBank('guide'); }}
              className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                filterChapter === ch && filterBank === 'guide'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-emerald-500/[0.04] text-emerald-600 hover:text-emerald-400 border border-emerald-500/10'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-[10px] text-amber-400 hover:text-amber-300 transition-colors">
            清除全部筛选
          </button>
        )}
      </div>

      {/* Question List */}
      {paged.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-sm text-slate-500">没有匹配的题目，尝试调整筛选条件</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map((q) => {
            const isExpanded = expandedId === q.id;
            return (
              <div
                key={q.id}
                className={`bg-[#1E293B] rounded-xl border transition-all ${
                  isExpanded ? 'border-amber-500/20' : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Header row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      q.type === 'single' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                      q.type === 'multiple' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                      q.type === 'judge' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                      q.type === 'short' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                      'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      {QUESTION_TYPE_LABELS[q.type]}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      q.difficulty === 'easy' ? 'bg-emerald-500/5 text-emerald-500' :
                      q.difficulty === 'medium' ? 'bg-amber-500/5 text-amber-500' :
                      'bg-red-500/5 text-red-500'
                    }`}>
                      {DIFFICULTY_LABELS[q.difficulty]}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      (q.bank ?? 'original') === 'screened'
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        : (q.bank ?? 'original') === 'guide'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-white/[0.02] border-white/10 text-slate-500'
                    }`}>
                      {(q.bank ?? 'original') === 'screened' ? '竞赛题库' : (q.bank ?? 'original') === 'guide' ? '指导书原题' : '系统题库'}
                    </span>
                    <span className="text-[10px] text-slate-600">{q.id}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{q.stem}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{q.chapter}</p>
                  </div>
                  <Eye className="w-4 h-4 text-slate-600 shrink-0" />
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-3">
                    <p className="text-sm text-slate-100 leading-relaxed">{q.stem}</p>

                    {q.options && (
                      <div className="space-y-1">
                        {q.options.map((opt) => (
                          <div
                            key={opt[0]}
                            className={`px-3 py-1.5 rounded text-xs border ${
                              q.correctAnswer.includes(opt[0])
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-white/[0.02] border-white/5 text-slate-500'
                            }`}
                          >
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold mr-2 ${
                              q.correctAnswer.includes(opt[0]) ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5'
                            }`}>
                              {opt[0]}
                            </span>
                            {opt.slice(3)}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/[0.02] rounded-lg p-2.5">
                        <span className="text-slate-600">题型：</span>
                        <span className="text-slate-300">{QUESTION_TYPE_LABELS[q.type]}</span>
                      </div>
                      <div className="bg-white/[0.02] rounded-lg p-2.5">
                        <span className="text-slate-600">难度：</span>
                        <span className="text-slate-300">{DIFFICULTY_LABELS[q.difficulty]}</span>
                      </div>
                      <div className="bg-white/[0.02] rounded-lg p-2.5">
                        <span className="text-slate-600">章节：</span>
                        <span className="text-slate-300">{q.chapter}</span>
                      </div>
                      <div className="bg-white/[0.02] rounded-lg p-2.5">
                        <span className="text-slate-600">教材：</span>
                        <span className="text-slate-300">{q.category === 'statistics' ? '统计学' : '数据挖掘'}</span>
                      </div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3">
                      <div className="text-[10px] text-emerald-400 font-semibold mb-1">正确答案</div>
                      <div className="text-sm text-emerald-300">
                        {q.correctAnswer.length > 100 ? q.correctAnswer.slice(0, 100) + '...' : q.correctAnswer}
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-semibold mb-1">
                        <Lightbulb className="w-3 h-3" />
                        解析
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{q.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 lg:gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 lg:p-2 rounded-lg bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-8 h-8 lg:w-9 lg:h-9 rounded-lg text-[10px] lg:text-xs font-medium transition-all ${
                  page === pageNum
                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                    : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 lg:p-2 rounded-lg bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom stats */}
      <div className="text-center text-[10px] text-slate-600">
        第 {page}/{totalPages} 页 · 共 {filtered.length} 题 · 题库总计 {allQuestions.length} 题
      </div>
    </div>
  );
}
