import { useEffect, useMemo, useState } from 'react';
import { useExamStore } from '../stores/examStore';
import { knowledgePoints } from '../data/knowledgePoints';
import { clearAllUserData } from '../utils/storage';
import { pushNow } from '../utils/sync';
import {
  TrendingUp,
  Target,
  BookOpen,
  AlertTriangle,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts';

function AnimatedNumber({ value }: { value: number }) {
  return (
    <span className="tabular-nums">
      {value}
    </span>
  );
}

export default function Dashboard() {
  const initialize = useExamStore((s) => s.initialize);
  const masteryData = useExamStore((s) => s.masteryData);
  const trendData = useExamStore((s) => s.trendData);
  const getMasteryLevel = useExamStore((s) => s.getMasteryLevel);
  const [clearing, setClearing] = useState(false);

  // 一键清空本账号全部答题记录（二次确认）
  const handleClearAll = async () => {
    if (clearing) return;
    const first = window.confirm(
      '确定要清空本账号的全部答题记录吗？\n\n将删除：答题记录、错题本、知识掌握度、答题趋势、练习/考试草稿、历史试卷。\n此操作不可恢复！'
    );
    if (!first) return;
    const second = window.confirm('【二次确认】所有答题数据将被永久删除，并同步删除云端备份。\n\n确定继续吗？');
    if (!second) return;
    setClearing(true);
    clearAllUserData();
    await pushNow(); // 立即把空数据推送到服务器，避免刷新后从云端恢复
    window.location.reload();
  };

  useEffect(() => {
    initialize();
  }, [initialize]);

  const stats = useMemo(() => {
    const totalKp = masteryData.length;
    const masteredKp = masteryData.filter((m) => m.masteryRate >= 80).length;
    const weakKp = masteryData.filter((m) => m.masteryRate < 60).length;
    const totalAttempts = masteryData.reduce((sum, m) => sum + m.totalAttempts, 0);
    const totalCorrect = masteryData.reduce((sum, m) => sum + m.correctCount, 0);
    const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    return { totalKp, masteredKp, weakKp, totalAttempts, totalCorrect, overallAccuracy };
  }, [masteryData]);

  // Radar chart data
  const radarData = useMemo(() => {
    return knowledgePoints
      .map((kp) => {
        const md = masteryData.find((m) => m.knowledgePointId === kp.id);
        return {
          name: kp.name.length > 8 ? kp.name.slice(0, 8) + '...' : kp.name,
          fullName: kp.name,
          chapter: kp.chapter,
          mastery: md ? md.masteryRate : 0,
        };
      })
      .sort((a, b) => a.mastery - b.mastery);
  }, [masteryData]);

  // Chapter progress
  const chapterProgress = useMemo(() => {
    const chapters = [...new Set(knowledgePoints.map((kp) => kp.chapter))];
    return chapters
      .map((ch) => {
        const kps = knowledgePoints.filter((kp) => kp.chapter === ch);
        const totalMastery = kps.reduce((sum, kp) => {
          const md = masteryData.find((m) => m.knowledgePointId === kp.id);
          return sum + (md ? md.masteryRate : 0);
        }, 0);
        const avgMastery = Math.round(totalMastery / kps.length);
        return { chapter: ch, mastery: avgMastery, count: kps.length };
      })
      .sort((a, b) => a.mastery - b.mastery);
  }, [masteryData]);

  // Trend data
  const trendChartData = useMemo(() => {
    return trendData.slice(-14).map((t) => ({
      ...t,
      date: t.date.slice(5),
    }));
  }, [trendData]);

  // Bottom weakest
  const weakestKps = useMemo(() => {
    return radarData.filter((d) => d.mastery < 70).slice(0, 6);
  }, [radarData]);

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
            知识掌握看板
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">实时追踪你的统计学知识掌握情况</p>
        </div>
        <button
          onClick={handleClearAll}
          disabled={clearing}
          title="清空本账号全部答题记录（需二次确认）"
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 disabled:opacity-50 text-xs font-medium rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {clearing ? '正在清空…' : '清空答题记录'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: BookOpen,
            label: '总答题数',
            value: stats.totalAttempts,
            suffix: '题',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
          },
          {
            icon: Target,
            label: '综合正确率',
            value: stats.overallAccuracy,
            suffix: '%',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
          },
          {
            icon: TrendingUp,
            label: '已掌握知识点',
            value: stats.masteredKp,
            suffix: `/${stats.totalKp}`,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
          },
          {
            icon: AlertTriangle,
            label: '薄弱知识点',
            value: stats.weakKp,
            suffix: '个',
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
          },
        ].map((card, i) => (
          <div
            key={card.label}
            className="bg-[#1E293B] rounded-xl p-4 lg:p-5 border border-white/5 hover:border-white/10 transition-all duration-300 hover:translate-y-[-2px]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-2 lg:mb-3">
              <span className="text-[10px] lg:text-xs font-medium text-slate-400 uppercase tracking-wider">{card.label}</span>
              <div className={`w-8 h-8 lg:w-9 lg:h-9 rounded-lg ${card.bg} ${card.border} border flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 lg:w-4.5 lg:h-4.5 ${card.color}`} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl lg:text-3xl font-bold ${card.color} tabular-nums`}>
                <AnimatedNumber value={card.value} />
              </span>
              <span className="text-xs lg:text-sm text-slate-500">{card.suffix}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar Chart */}
        <div className="lg:col-span-2 bg-[#1E293B] rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            知识点掌握雷达图
          </h3>
          <>
          <ResponsiveContainer width="100%" height={280} className="lg:hidden">
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis
                dataKey="name"
                tick={{ fill: '#94A3B8', fontSize: 10 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#64748B', fontSize: 9 }}
                axisLine={false}
              />
              <Radar
                name="掌握度"
                dataKey="mastery"
                stroke="#F59E0B"
                fill="#F59E0B"
                fillOpacity={0.15}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={400} className="hidden lg:block">
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis
                dataKey="name"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#64748B', fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="掌握度"
                dataKey="mastery"
                stroke="#F59E0B"
                fill="#F59E0B"
                fillOpacity={0.15}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
          </>
        </div>

        {/* Trend Chart */}
        <div className="bg-[#1E293B] rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            近期答题趋势
          </h3>
          {trendChartData.length > 0 ? (
            <>
            <ResponsiveContainer width="100%" height={280} className="lg:hidden">
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="trendGradientM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 9 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 9 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2} fill="url(#trendGradientM)" />
              </AreaChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={400} className="hidden lg:block">
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#trendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
            </>
          ) : (
            <div className="h-[280px] lg:h-[400px] flex items-center justify-center text-slate-500 text-xs lg:text-sm">
              暂无答题数据，开始练习后展示趋势图
            </div>
          )}
        </div>
      </div>

      {/* Chapter Progress */}
      <div className="bg-[#1E293B] rounded-xl p-6 border border-white/5">
        <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          章节掌握进度
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {chapterProgress.map((ch) => {
            const level = getMasteryLevel(ch.mastery);
            return (
              <div
                key={ch.chapter}
                className="flex items-center gap-4 bg-white/[0.02] rounded-lg px-4 py-3 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-300 truncate">{ch.chapter}</span>
                    <span className="text-xs font-medium ml-2" style={{ color: level.color }}>
                      {ch.mastery}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${ch.mastery}%`,
                        backgroundColor: level.color,
                      }}
                    />
                  </div>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{
                    backgroundColor: level.color + '20',
                    color: level.color,
                  }}
                >
                  {level.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weakest Areas Quick View */}
      {weakestKps.length > 0 && (
        <div className="bg-[#1E293B] rounded-xl p-6 border border-white/5 border-l-2 border-l-red-500/50">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            需优先加强的知识点
          </h3>
          <div className="flex flex-wrap gap-2">
            {weakestKps.map((kp) => (
              <div
                key={kp.fullName}
                className="flex items-center gap-2 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-1.5"
              >
                <span className="text-xs text-slate-300">{kp.fullName}</span>
                <span className="text-[11px] text-red-400 font-medium">{kp.mastery}%</span>
                <ChevronUp className="w-3 h-3 text-red-400/50" style={{ transform: 'rotate(45deg)' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
