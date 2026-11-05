import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../stores/examStore';
import type { WeaknessItem } from '../types';
import {
  TrendingUp,
  Brain,
  ArrowRight,
  AlertTriangle,
  Target,
  Zap,
  Shield,
  BookOpen,
} from 'lucide-react';
import { getWeaknesses, getMasteryLevel } from '../utils/mastery';

export default function WeaknessAnalysis() {
  const navigate = useNavigate();
  const initialize = useExamStore((s) => s.initialize);
  const masteryData = useExamStore((s) => s.masteryData);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const weaknesses = useMemo(() => getWeaknesses(masteryData), [masteryData]);

  const hasData = masteryData.some((m) => m.totalAttempts > 0);

  const priorityConfig = {
    high: { label: '急需加强', color: '#EF4444', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertTriangle },
    medium: { label: '需要巩固', color: '#F97316', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Zap },
    low: { label: '保持即可', color: '#F59E0B', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Shield },
  };

  if (!hasData) {
    return (
      <div className="animate-fadeIn space-y-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>薄弱点分析</h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">基于你的答题历史，智能分析需要加强的知识领域</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 lg:py-20 text-center">
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 lg:mb-5">
            <Brain className="w-8 h-8 lg:w-10 lg:h-10 text-blue-400" />
          </div>
          <h3 className="text-base lg:text-lg font-semibold text-white mb-2">暂无分析数据</h3>
          <p className="text-xs lg:text-sm text-slate-500 max-w-md px-4">
            完成一些练习后，系统将自动分析你的薄弱知识点，并生成针对性的强化建议。
          </p>
          <button
            onClick={() => navigate('/practice')}
            className="mt-6 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-[#0B1121] font-semibold rounded-lg transition-all text-sm"
          >
            开始练习
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>薄弱点分析</h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            发现 {weaknesses.length} 个需要加强的知识点
          </p>
        </div>
        {weaknesses.length > 0 && (
          <button
            onClick={() => navigate('/practice')}
            className="self-start sm:self-auto px-4 lg:px-5 py-2 lg:py-2.5 bg-amber-500 hover:bg-amber-400 text-[#0B1121] font-semibold rounded-lg transition-all text-xs lg:text-sm flex items-center gap-2"
          >
            <Target className="w-4 h-4" />
            针对性练习
          </button>
        )}
      </div>

      {/* Priority Summary */}
      <div className="grid grid-cols-3 gap-3">
        {(['high', 'medium', 'low'] as const).map((priority) => {
          const cfg = priorityConfig[priority];
          const count = weaknesses.filter((w) => w.priority === priority).length;
          const Icon = cfg.icon;
          return (
            <div key={priority} className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 text-center`}>
              <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: cfg.color }} />
              <div className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</div>
              <div className="text-[10px] mt-1" style={{ color: cfg.color, opacity: 0.7 }}>{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Weakness List */}
      {weaknesses.length > 0 ? (
        <div className="space-y-3">
          {weaknesses.map((item) => {
            const cfg = priorityConfig[item.priority];
            const Icon = cfg.icon;
            const level = getMasteryLevel(item.masteryData.masteryRate);
            return (
              <div
                key={item.knowledgePoint.id}
                className="bg-[#1E293B] rounded-xl border border-white/5 hover:border-white/10 transition-all p-4 lg:p-5"
              >
                <div className="flex items-start gap-3 lg:gap-4">
                  <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg ${cfg.bg} ${cfg.border} border flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2 lg:space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs lg:text-sm font-semibold text-white">{item.knowledgePoint.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.knowledgePoint.chapter}</p>
                      </div>
                      <div className="sm:text-right shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base lg:text-lg font-bold" style={{ color: level.color }}>
                            {item.masteryData.masteryRate}%
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium`} style={{
                            backgroundColor: level.color + '20',
                            color: level.color,
                          }}>
                            {level.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.masteryData.masteryRate}%`,
                          backgroundColor: level.color,
                        }}
                      />
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-[10px] lg:text-xs text-slate-500">
                      <span>答题 {item.masteryData.totalAttempts} 次</span>
                      <span>正确 {item.masteryData.correctCount} 次</span>
                      <span className="flex items-center gap-1" style={{ color: cfg.color }}>
                        <AlertTriangle className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Recommendation */}
                    <div className="bg-white/[0.02] rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mb-1">
                        <BookOpen className="w-3 h-3" />
                        强化建议
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {item.priority === 'high'
                          ? `重点学习"${item.knowledgePoint.name}"相关概念和公式，建议先复习教材${item.knowledgePoint.chapter}，然后完成至少10道针对性练习题。`
                          : item.priority === 'medium'
                          ? `巩固"${item.knowledgePoint.name}"的理解，关注易混淆概念，建议做5-8道混合难度的练习题。`
                          : `保持当前水平，定期进行复习练习，防止遗忘。`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 lg:py-16 text-center">
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 lg:mb-5">
            <TrendingUp className="w-8 h-8 lg:w-10 lg:h-10 text-emerald-400" />
          </div>
          <h3 className="text-base lg:text-lg font-semibold text-white mb-2">全部掌握良好!</h3>
          <p className="text-xs lg:text-sm text-slate-500 max-w-md px-4">
            所有知识点的掌握程度都在70%以上，继续保持！
          </p>
        </div>
      )}
    </div>
  );
}
