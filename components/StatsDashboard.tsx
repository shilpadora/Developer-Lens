import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { GitStats } from '../types.ts';
import { Activity, Code2, Users2 } from 'lucide-react';

const StatsDashboard: React.FC<{ stats: GitStats }> = ({ stats }) => {
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const extensions = Object.entries(stats.extensions)
    .map(([name, value]) => ({ name, value }))
    .sort((a,b) => b.value - a.value).slice(0, 6);

  return (
    <div className="h-full overflow-y-auto p-10 space-y-10 custom-scrollbar">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800 shadow-xl">
           <div className="flex items-center gap-3 mb-8">
             <Activity className="text-emerald-500" size={20} />
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Commit Velocity</h3>
           </div>
           <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={stats.commits}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                 <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} />
                 <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                 <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }} />
                 <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800 shadow-xl">
           <div className="flex items-center gap-3 mb-8">
             <Code2 className="text-emerald-500" size={20} />
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">File Extensions</h3>
           </div>
           <div className="h-72 flex flex-col items-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={extensions} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                   {extensions.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                 </Pie>
                 <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
               </PieChart>
             </ResponsiveContainer>
             <div className="flex flex-wrap gap-4 justify-center mt-4">
               {extensions.map((e, i) => (
                 <div key={e.name} className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{e.name}</span>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>

      <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-800 shadow-xl">
         <div className="flex items-center gap-3 mb-10">
           <Users2 className="text-emerald-500" size={20} />
           <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Contributer Impact</h3>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
           {stats.contributors.map(c => (
             <div key={c.author} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/30 transition-all">
               <h4 className="font-black text-emerald-500 text-lg mb-4 truncate">{c.author}</h4>
               <div className="space-y-2">
                 <Metric label="Commits" value={c.commits} />
                 <Metric label="Additions" value={c.additions} color="text-emerald-500" />
                 <Metric label="Deletions" value={c.deletions} color="text-red-500" />
               </div>
             </div>
           ))}
         </div>
      </div>
    </div>
  );
};

const Metric = ({ label, value, color = "text-slate-300" }: { label: string, value: number, color?: string }) => (
  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest border-b border-slate-900 pb-2">
    <span className="text-slate-500">{label}</span>
    <span className={color}>{value.toLocaleString()}</span>
  </div>
);

export default StatsDashboard;