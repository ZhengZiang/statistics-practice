import { useMemo } from 'react';
import { allQuestions } from '../data/questions';

// 章节选择：系统题库（统计学/数据挖掘）+ 统计学竞赛题 + 指导书原题，四组独立多选
export interface ChapterSelection {
  original: string[]; // 系统题库已选章节（统计学 + 数据挖掘）
  screened: string[]; // 统计学竞赛题已选章节
  guide: string[]; // 指导书原题已选章节
}

type GroupKey = 'stats' | 'dm' | 'sq' | 'guide';

const byChapterNo = (a: string, b: string) => {
  const na = parseInt(a.match(/第(\d+)章/)?.[1] ?? '999', 10);
  const nb = parseInt(b.match(/第(\d+)章/)?.[1] ?? '999', 10);
  return na - nb || a.localeCompare(b, 'zh');
};

interface Props {
  value: ChapterSelection;
  onChange: (v: ChapterSelection) => void;
  groups?: GroupKey[]; // 默认 ['stats','dm','sq','guide']
}

const GROUP_STYLE: Record<GroupKey, { label: string; labelCls: string; active: string; idle: string }> = {
  stats: {
    label: '统计学：',
    labelCls: 'text-amber-500/80',
    active: 'bg-amber-500/20 text-amber-300',
    idle: 'bg-amber-500/[0.04] text-amber-400/60 hover:text-amber-300 border border-amber-500/10',
  },
  dm: {
    label: '数据挖掘：',
    labelCls: 'text-violet-400/80',
    active: 'bg-violet-500/20 text-violet-300',
    idle: 'bg-violet-500/[0.04] text-violet-400/60 hover:text-violet-300 border border-violet-500/10',
  },
  sq: {
    label: '统计学竞赛题：',
    labelCls: 'text-cyan-500',
    active: 'bg-cyan-500/20 text-cyan-300',
    idle: 'bg-cyan-500/[0.04] text-cyan-600 hover:text-cyan-400 border border-cyan-500/10',
  },
  guide: {
    label: '指导书原题：',
    labelCls: 'text-emerald-500',
    active: 'bg-emerald-500/20 text-emerald-300',
    idle: 'bg-emerald-500/[0.04] text-emerald-600 hover:text-emerald-400 border border-emerald-500/10',
  },
};

export default function ChapterRangePicker({ value, onChange, groups = ['stats', 'dm', 'sq', 'guide'] }: Props) {
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

  const toggle = (group: GroupKey, ch: string) => {
    if (group === 'sq') {
      const next = value.screened.includes(ch)
        ? value.screened.filter((x) => x !== ch)
        : [...value.screened, ch];
      onChange({ ...value, screened: next });
    } else if (group === 'guide') {
      const next = value.guide.includes(ch)
        ? value.guide.filter((x) => x !== ch)
        : [...value.guide, ch];
      onChange({ ...value, guide: next });
    } else {
      const next = value.original.includes(ch)
        ? value.original.filter((x) => x !== ch)
        : [...value.original, ch];
      onChange({ ...value, original: next });
    }
  };

  const rows: { key: GroupKey; chapters: string[] }[] = [
    { key: 'stats', chapters: statsChapters },
    { key: 'dm', chapters: dmChapters },
    { key: 'sq', chapters: sqChapters },
    { key: 'guide', chapters: guideChapters },
  ];

  return (
    <div className="space-y-2">
      {rows.filter((r) => groups.includes(r.key)).map(({ key, chapters }) => {
        const style = GROUP_STYLE[key];
        const selected = key === 'sq' ? value.screened : key === 'guide' ? value.guide : value.original;
        return (
          <div key={key} className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] ${style.labelCls} mr-1 shrink-0`}>{style.label}</span>
            {chapters.map((ch) => (
              <button
                key={`${key}-${ch}`}
                onClick={() => toggle(key, ch)}
                className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                  selected.includes(ch) ? style.active : style.idle
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
