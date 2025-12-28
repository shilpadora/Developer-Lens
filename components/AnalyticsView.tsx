
import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { GitStats } from '../types';
import { GitCommit, Users, Code, Activity } from 'lucide-react';

interface Props {
  stats: GitStats;
}

const AnalyticsView: React.FC<Props> = ({ stats }) => {
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const extensionData = Object.entries(stats.extensions)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full overflow-y-auto">
      {/* Velocity Chart */}
      <div className="col-span-1 lg:col-span-2 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="text-emerald-500" size={20} />
          <h3 className="text-lg font-bold">Commit Velocity</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.commits}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Extension Distribution */}
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <div className="flex items-center gap-2 mb-6">
          <Code className="text-emerald-500" size={20} />
          <h3 className="text-lg font-bold">Files by Extension</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={extensionData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {extensionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
             {extensionData.map((d, i) => (
               <div key={d.name} className="flex items-center gap-2 text-xs text-slate-400">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                 {d.name}
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Contributor Impact */}
      <div className="col-span-1 lg:col-span-3 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <div className="flex items-center gap-2 mb-6">
          <Users className="text-emerald-500" size={20} />
          <h3 className="text-lg font-bold">Contributor Impact</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.contributors.map((c, i) => (
            <div key={i} className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="font-bold text-emerald-400 truncate mb-2">{c.author}</div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Commits</span>
                <span>{c.commits}</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Lines Added</span>
                <span className="text-emerald-500">+{c.additions}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Lines Deleted</span>
                <span className="text-red-500">-{c.deletions}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
