import type { KnowledgePoint } from '../types';

export const knowledgePoints: KnowledgePoint[] = [
  // 第1章 导论
  { id: 'kp-1-1', name: '统计学基本概念', chapter: '第1章 导论', category: 'statistics' },
  { id: 'kp-1-2', name: '数据类型与分类', chapter: '第1章 导论', category: 'statistics' },
  { id: 'kp-1-3', name: '抽样方法', chapter: '第1章 导论', category: 'statistics' },
  // 第2章 数据的搜集
  { id: 'kp-2-1', name: '调查方法与问卷设计', chapter: '第2章 数据的搜集', category: 'statistics' },
  { id: 'kp-2-2', name: '实验设计原则', chapter: '第2章 数据的搜集', category: 'statistics' },
  { id: 'kp-2-3', name: '数据来源与误差', chapter: '第2章 数据的搜集', category: 'statistics' },
  // 第3章 数据的图表展示
  { id: 'kp-3-1', name: '频数分布与统计表', chapter: '第3章 数据的图表展示', category: 'statistics' },
  { id: 'kp-3-2', name: '统计图（直方图、箱线图等）', chapter: '第3章 数据的图表展示', category: 'statistics' },
  // 第4章 数据的概括性度量
  { id: 'kp-4-1', name: '集中趋势度量', chapter: '第4章 数据的概括性度量', category: 'statistics' },
  { id: 'kp-4-2', name: '离散程度度量', chapter: '第4章 数据的概括性度量', category: 'statistics' },
  { id: 'kp-4-3', name: '分布形态（偏度与峰度）', chapter: '第4章 数据的概括性度量', category: 'statistics' },
  // 第5章 概率与概率分布
  { id: 'kp-5-1', name: '概率基础与贝叶斯定理', chapter: '第5章 概率与概率分布', category: 'statistics' },
  { id: 'kp-5-2', name: '离散型概率分布', chapter: '第5章 概率与概率分布', category: 'statistics' },
  { id: 'kp-5-3', name: '连续型概率分布', chapter: '第5章 概率与概率分布', category: 'statistics' },
  // 第6章 统计量及其抽样分布
  { id: 'kp-6-1', name: '统计量与抽样分布', chapter: '第6章 统计量及其抽样分布', category: 'statistics' },
  { id: 'kp-6-2', name: '中心极限定理', chapter: '第6章 统计量及其抽样分布', category: 'statistics' },
  // 第7章 参数估计
  { id: 'kp-7-1', name: '点估计与估计量评价', chapter: '第7章 参数估计', category: 'statistics' },
  { id: 'kp-7-2', name: '区间估计', chapter: '第7章 参数估计', category: 'statistics' },
  { id: 'kp-7-3', name: '样本量确定', chapter: '第7章 参数估计', category: 'statistics' },
  // 第8章 假设检验
  { id: 'kp-8-1', name: '假设检验基本原理', chapter: '第8章 假设检验', category: 'statistics' },
  { id: 'kp-8-2', name: '单样本与双样本t检验', chapter: '第8章 假设检验', category: 'statistics' },
  { id: 'kp-8-3', name: '卡方检验', chapter: '第8章 假设检验', category: 'statistics' },
  // 第9章 分类数据分析
  { id: 'kp-9-1', name: '列联表分析', chapter: '第9章 分类数据分析', category: 'statistics' },
  { id: 'kp-9-2', name: '独立性检验与拟合优度', chapter: '第9章 分类数据分析', category: 'statistics' },
  // 第10章 方差分析
  { id: 'kp-10-1', name: '单因素方差分析', chapter: '第10章 方差分析', category: 'statistics' },
  { id: 'kp-10-2', name: '双因素方差分析', chapter: '第10章 方差分析', category: 'statistics' },
  // 第11章 回归分析
  { id: 'kp-11-1', name: '一元线性回归', chapter: '第11章 回归分析', category: 'statistics' },
  { id: 'kp-11-2', name: '多元线性回归', chapter: '第11章 回归分析', category: 'statistics' },
  { id: 'kp-11-3', name: '回归诊断与模型选择', chapter: '第11章 回归分析', category: 'statistics' },
  // 第12章 时间序列
  { id: 'kp-12-1', name: '时间序列成分与分解', chapter: '第12章 时间序列', category: 'statistics' },
  { id: 'kp-12-2', name: '趋势与季节调整', chapter: '第12章 时间序列', category: 'statistics' },
  { id: 'kp-12-3', name: '时间序列预测方法', chapter: '第12章 时间序列', category: 'statistics' },
  // 第13章 指数
  { id: 'kp-13-1', name: '价格指数与数量指数', chapter: '第13章 指数', category: 'statistics' },
  { id: 'kp-13-2', name: '综合指数与平均指数', chapter: '第13章 指数', category: 'statistics' },
  // 数据挖掘教材 — 第1章 数据挖掘导论
  { id: 'kp-dm-1-1', name: '数据挖掘定义与流程', chapter: 'DM第1章 数据挖掘导论', category: 'data-mining' },
  { id: 'kp-dm-1-2', name: '数据挖掘任务（分类/聚类/关联等）', chapter: 'DM第1章 数据挖掘导论', category: 'data-mining' },
  { id: 'kp-dm-1-3', name: '数据挖掘与统计学/机器学习的联系', chapter: 'DM第1章 数据挖掘导论', category: 'data-mining' },
  // 数据挖掘教材 — 第2章 数据预处理
  { id: 'kp-dm-2-1', name: '数据清洗与缺失值处理', chapter: 'DM第2章 数据预处理', category: 'data-mining' },
  { id: 'kp-dm-2-2', name: '数据集成与变换', chapter: 'DM第2章 数据预处理', category: 'data-mining' },
  { id: 'kp-dm-2-3', name: '数据归约与降维', chapter: 'DM第2章 数据预处理', category: 'data-mining' },
  // 数据挖掘教材 — 第3章 分类与预测
  { id: 'kp-dm-3-1', name: '决策树与信息增益', chapter: 'DM第3章 分类与预测', category: 'data-mining' },
  { id: 'kp-dm-3-2', name: '朴素贝叶斯分类器', chapter: 'DM第3章 分类与预测', category: 'data-mining' },
  { id: 'kp-dm-3-3', name: 'KNN与基于实例的学习', chapter: 'DM第3章 分类与预测', category: 'data-mining' },
  { id: 'kp-dm-3-4', name: '支持向量机(SVM)', chapter: 'DM第3章 分类与预测', category: 'data-mining' },
  { id: 'kp-dm-3-5', name: '集成学习与随机森林', chapter: 'DM第3章 分类与预测', category: 'data-mining' },
  // 数据挖掘教材 — 第4章 聚类分析
  { id: 'kp-dm-4-1', name: '聚类基础与距离度量', chapter: 'DM第4章 聚类分析', category: 'data-mining' },
  { id: 'kp-dm-4-2', name: 'K-means与K-medoids', chapter: 'DM第4章 聚类分析', category: 'data-mining' },
  { id: 'kp-dm-4-3', name: '层次聚类与DBSCAN', chapter: 'DM第4章 聚类分析', category: 'data-mining' },
  { id: 'kp-dm-4-4', name: '聚类评估方法', chapter: 'DM第4章 聚类分析', category: 'data-mining' },
  // 数据挖掘教材 — 第5章 关联规则挖掘
  { id: 'kp-dm-5-1', name: '频繁项集与支持度-置信度框架', chapter: 'DM第5章 关联规则挖掘', category: 'data-mining' },
  { id: 'kp-dm-5-2', name: 'Apriori算法原理与优化', chapter: 'DM第5章 关联规则挖掘', category: 'data-mining' },
  { id: 'kp-dm-5-3', name: 'FP-Growth算法', chapter: 'DM第5章 关联规则挖掘', category: 'data-mining' },
  // 数据挖掘教材 — 第6章 模型评估与选择
  { id: 'kp-dm-6-1', name: '过拟合与欠拟合', chapter: 'DM第6章 模型评估与选择', category: 'data-mining' },
  { id: 'kp-dm-6-2', name: '交叉验证与性能度量', chapter: 'DM第6章 模型评估与选择', category: 'data-mining' },
  { id: 'kp-dm-6-3', name: '偏差-方差权衡', chapter: 'DM第6章 模型评估与选择', category: 'data-mining' },
  // 数据挖掘教材 — 第7章 数据挖掘应用
  { id: 'kp-dm-7-1', name: '推荐系统基础', chapter: 'DM第7章 数据挖掘应用', category: 'data-mining' },
  { id: 'kp-dm-7-2', name: '文本挖掘与情感分析', chapter: 'DM第7章 数据挖掘应用', category: 'data-mining' },
  { id: 'kp-dm-7-3', name: '数据挖掘中的伦理与隐私', chapter: 'DM第7章 数据挖掘应用', category: 'data-mining' },
];

export function getKnowledgePointById(id: string): KnowledgePoint | undefined {
  return knowledgePoints.find((kp) => kp.id === id);
}

export function getKnowledgePointsByChapter(chapter: string): KnowledgePoint[] {
  return knowledgePoints.filter((kp) => kp.chapter === chapter);
}

export function getKnowledgePointsByCategory(category: 'statistics' | 'data-mining'): KnowledgePoint[] {
  return knowledgePoints.filter((kp) => kp.category === category);
}
