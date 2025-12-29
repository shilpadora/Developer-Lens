
import React, { useState, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { GitStats, TimePeriod } from '../types';
import { Activity, Code2, Users2, Calendar, PlusCircle, MinusCircle, User } from 'lucide-react';

const StatsDashboard: React.FC<{ stats: GitStats }> = ({ stats }) => {
  const [activePeriod, setActivePeriod] = useState<TimePeriod>('thisMonth');
  const [contributorMetric, setContributorMetric] = useState<'commits' | 'additions' | 'deletions'>('commits');

  const currentMetric = useMemo(() => stats.periods[activePeriod], [stats, activePeriod]);

  const extensions = useMemo(() => Object.entries(stats.extensions)
    .map(([name, value]) => ({ name, value }))
    .sort((a: any, b: any) => (b.value as number) - (a.value as number)).slice(0, 6), [stats]);

  const sortedContributors = useMemo(() => [...currentMetric.contributors]
    .sort((a: any, b: any) => (b[contributorMetric] as number) - (a[contributorMetric] as number))
    .slice(0, 10), [currentMetric, contributorMetric]);

  const periods: { id: TimePeriod; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'thisWeek', label: 'This Week' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'thisYear', label: 'This Year' },
    { id: 'total', label: 'All Time' },
  ];

  const currentPeriodLabel = periods.find(p => p.id === activePeriod)?.label || '';

  return (
    <div className="h-full overflow-y-auto p-8 lg:p-12 space-y-12 custom-scrollbar bg-slate-950/20">
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/40 p-2 rounded-3xl border border-slate-800 w-fit">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePeriod(p.id)}
            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activePeriod === p.id
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <SummaryCard
          label={`${currentPeriodLabel} Commits`}
          value={currentMetric.commits.toLocaleString()}
          icon={<Activity size={20} />}
          color="text-emerald-500"
        />
        <SummaryCard
          label={`${currentPeriodLabel} Adds`}
          value={`+${currentMetric.additions.toLocaleString()}`}
          icon={<PlusCircle size={20} />}
          color="text-emerald-400"
        />
        <SummaryCard
          label={`${currentPeriodLabel} Dels`}
          value={`-${currentMetric.deletions.toLocaleString()}`}
          icon={<MinusCircle size={20} />}
          color="text-red-500"
        />
        <SummaryCard
          label="Primary Extension"
          value={extensions[0]?.name.toUpperCase() || 'N/A'}
          icon={<Code2 size={20} />}
          color="text-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-10">
        <div className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <Calendar className="text-emerald-500" size={24} />
              <h3 className="text-lg font-black uppercase tracking-tighter text-slate-200">Velocity Graph</h3>
            </div>
            <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[9px] font-black text-emerald-500 uppercase tracking-widest">
              {currentPeriodLabel} Momentum
            </div>
          </div>
          <div className="h-80 w-full">
            {stats.monthlyActivity && stats.monthlyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyActivity}>
                  <defs>
                    <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '16px',
                      fontSize: '11px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="commits"
                    stroke="#10b981"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorCommits)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl">
                <Activity size={48} className="text-slate-800 mb-4 animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No Commit History Detected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        <div className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
            <div className="flex items-center gap-4">
              <Users2 className="text-emerald-500" size={24} />
              <h3 className="text-lg font-black uppercase tracking-tighter text-slate-200">Contributors - {currentPeriodLabel}</h3>
            </div>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <MetricTab active={contributorMetric === 'commits'} onClick={() => setContributorMetric('commits')} label="Commits" />
              <MetricTab active={contributorMetric === 'additions'} onClick={() => setContributorMetric('additions')} label="Adds" />
              <MetricTab active={contributorMetric === 'deletions'} onClick={() => setContributorMetric('deletions')} label="Dels" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedContributors.length > 0 ? sortedContributors.map((c, i) => (
              <div key={c.author} className="flex items-center justify-between p-5 bg-slate-950/50 rounded-3xl border border-slate-800 hover:border-emerald-500/30 transition-all group">
                <div className="flex items-center gap-5">
                  <span className="text-lg font-black text-slate-800 group-hover:text-emerald-500/50 transition-colors">#{i + 1}</span>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                    <User size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-200 uppercase tracking-tighter text-sm">@{c.author}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] font-black uppercase text-emerald-500">+{c.additions.toLocaleString()}</span>
                      <span className="text-[9px] font-black uppercase text-red-500">-{c.deletions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-white tracking-tighter">
                    {contributorMetric === 'commits' ? c.commits : contributorMetric === 'additions' ? `+${c.additions.toLocaleString()}` : `-${c.deletions.toLocaleString()}`}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{contributorMetric.toUpperCase()}</span>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center text-slate-700 font-black uppercase tracking-widest text-xs opacity-40 border-2 border-dashed border-slate-800 rounded-3xl">
                No activity captured for this period
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) => (
  <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 shadow-xl flex flex-col justify-between hover:border-emerald-500/20 transition-all group">
    <div className={`p-4 w-fit rounded-2xl bg-slate-950 border border-slate-800 mb-8 ${color} group-hover:scale-110 transition-transform shadow-inner`}>
      {icon}
    </div>
    <div>
      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-2">{label}</h4>
      <div className={`text-4xl font-black tracking-tighter leading-none ${color}`}>{value}</div>
    </div>
  </div>
);

const MetricTab = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${active ? 'bg-emerald-500 text-slate-950' : 'text-slate-600 hover:text-slate-300'}`}
  >
    {label}
  </button>
);

export default StatsDashboard;
