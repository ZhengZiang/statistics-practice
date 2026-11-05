import { useState } from 'react';
import { BookOpen, ChevronDown, Lightbulb, AlertTriangle, Sigma, Library } from 'lucide-react';
import { bookInsights } from '../data/bookInsights';
import type { ChapterInsight } from '../data/bookInsights';

function ChapterCard({ ch, index }: { ch: ChapterInsight; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{ch.title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{ch.summary}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-white/5">
          {/* 本章导读 */}
          <p className="text-[13px] leading-relaxed text-slate-300 pt-3">{ch.summary}</p>

          {/* 核心要点 */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 tracking-wide">核心要点</span>
            </div>
            <ul className="space-y-1.5">
              {ch.keyPoints.map((p, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-slate-300">
                  <span className="text-amber-500/60 shrink-0">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 关键公式/概念 */}
          {ch.formulas && ch.formulas.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Sigma className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-semibold text-sky-400 tracking-wide">关键公式 / 概念</span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {ch.formulas.map((f, i) => (
                  <div
                    key={i}
                    className="text-[12px] leading-relaxed text-slate-300 bg-sky-500/[0.06] border border-sky-500/10 rounded-lg px-3 py-2"
                  >
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 易错点 / 应试提示 */}
          {ch.pitfalls && ch.pitfalls.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-semibold text-red-400 tracking-wide">易错点 / 提示</span>
              </div>
              <ul className="space-y-1.5">
                {ch.pitfalls.map((p, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-slate-400">
                    <span className="text-red-500/60 shrink-0">▸</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BookInsights() {
  const [activeBook, setActiveBook] = useState(bookInsights[0]?.id ?? '');
  const book = bookInsights.find((b) => b.id === activeBook) ?? bookInsights[0];

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          <Library className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">书籍精华</h1>
          <p className="text-xs text-slate-500 mt-0.5">教材逐章提炼：核心要点 · 关键公式 · 易错提示</p>
        </div>
      </div>

      {/* 书籍切换 */}
      <div className="flex gap-2 flex-wrap">
        {bookInsights.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBook(b.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all border ${
              activeBook === b.id
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                : 'text-slate-400 border-white/5 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">{b.bookName}</span>
          </button>
        ))}
      </div>

      {book && (
        <>
          {/* 书籍信息 */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl px-5 py-4">
            <p className="text-sm text-white font-medium">
              《{book.bookName}》 <span className="text-slate-500 font-normal">{book.author}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{book.description}</p>
          </div>

          {/* 章节列表 */}
          <div className="space-y-3">
            {book.chapters.map((ch, i) => (
              <ChapterCard key={ch.chapter} ch={ch} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
