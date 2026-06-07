import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, AlertTriangle, BarChart3, Target } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import useUIStore from '../../stores/useUIStore';
import { getUserPerformanceStats, generateInsights } from '../../engines/insightEngine';
import { formatCompact, formatPercent } from '../../utils/formatUtils';
import TargetRing from './TargetRing';
import AnimatedCounter from '../common/AnimatedCounter';
import TeamSettings from '../manager/TeamSettings';
import TeamCommandPanel from './TeamCommandPanel';
import Leaderboard from './Leaderboard';

export default function ManagerDashboard() {
  const { leads, activities } = useLeadStore();
  const { users } = useUserStore();
  const { openLeadDetail } = useUIStore();
  const sales = users.filter(u => u.role === 'sales');
  const team = useMemo(() => sales.map(u => ({ ...u, stats: getUserPerformanceStats(u.id, leads, activities) })).sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue), [leads, activities, sales]);
  const insights = useMemo(() => generateInsights(leads, activities, users), [leads, activities, users]);
  const totRev = leads.reduce((s, l) => s + (Number(l.revenue) || 0), 0);
  const totConv = leads.filter(l => ['payment_done', 'upgrade', 'closed_won'].includes(l.status)).length;
  
  const risky = useMemo(() => {
    const now = new Date();
    return leads.filter(l => {
      if (['closed_won', 'closed_lost'].includes(l.status)) return false;
      const h = l.last_activity_at ? (now - new Date(l.last_activity_at)) / 3600000 : 999;
      return h > 48 || (l.next_follow_up && new Date(l.next_follow_up) < new Date(now - 86400000));
    }).slice(0, 8);
  }, [leads]);
  
  const [activeTab, setActiveTab] = useState('command');

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-white/[0.05] pb-2">
        {[
          { id: 'command', label: 'God Mode', color: 'cyan', icon: Target },
          { id: 'leaderboard', label: 'Leaderboard', color: 'amber', icon: Shield },
          { id: 'settings', label: 'Team Admin', color: 'violet', icon: BarChart3 },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-widest pb-2 px-2 transition-all ${activeTab === tab.id ? `text-${tab.color} border-b-2 border-${tab.color}` : 'text-txt-dim hover:text-txt-ghost'}`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'command' && (
        <div className="flex-1 overflow-y-auto pb-10">
          <TeamCommandPanel />
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="space-y-6 overflow-y-auto flex-1 pb-10">
          {/* Hero Row */}
          <div className="grid grid-cols-3 gap-4">
            <TargetRing userId={null} />
            <div className="col-span-2 glass-3d gradient-border p-6 grid grid-cols-4 gap-6">
              {[
                { label: 'Team Revenue', val: totRev, fmt: true, neon: 'neon-mint' },
                { label: 'Conversions', val: totConv, neon: 'neon-cyan' },
                { label: 'Active Leads', val: leads.filter(l => !['closed_won', 'closed_lost'].includes(l.status)).length, neon: 'neon-violet' },
                { label: 'At Risk', val: risky.length, neon: risky.length > 3 ? 'neon-rose' : 'neon-amber' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="text-center">
                  {s.fmt ? (
                    <div className={`text-[30px] font-black font-display tabular-nums ${s.neon}`}>{formatCompact(s.val)}</div>
                  ) : (
                    <AnimatedCounter value={s.val} className={`text-[30px] font-black font-display tabular-nums ${s.neon}`} />
                  )}
                  <div className="text-[12px] font-bold text-txt-bright mt-1">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <Leaderboard />
          </div>

          {/* Bottom: Insights + Risk */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-3d p-5">
              <h3 className="text-[14px] font-black font-display text-txt-glow mb-4 flex items-center gap-2"><TrendingUp size={16} className="neon-amber" /> AI Insights</h3>
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {insights.slice(0, 6).map((ins, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className={`p-3.5 rounded-xl border ${ins.type === 'danger' ? 'border-rose/15 bg-rose/[0.04]' : ins.type === 'warning' ? 'border-amber/15 bg-amber/[0.04]' : ins.type === 'success' ? 'border-mint/15 bg-mint/[0.04]' : 'border-cyan/15 bg-cyan/[0.04]'}`}>
                    <div className="flex items-start gap-2.5"><span className="text-[16px]">{ins.icon}</span><div><div className="text-[12px] font-bold text-txt-bright">{ins.title}</div><div className="text-[11px] text-txt-dim leading-relaxed">{ins.description}</div></div></div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="glass-3d p-5">
              <h3 className="text-[14px] font-black font-display text-txt-glow mb-4 flex items-center gap-2"><AlertTriangle size={16} className="neon-rose" /> Leads at Risk</h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {risky.map((lead, i) => {
                  const o = users.find(x => x.id === lead.assigned_to);
                  return (
                    <motion.div key={lead.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      onClick={() => openLeadDetail(lead.id)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-rose/10 bg-rose/[0.03] cursor-pointer hover:bg-rose/[0.06] transition-colors group">
                      <div className="w-2 h-2 rounded-full bg-rose pulse-glow flex-shrink-0" />
                      <div className="flex-1 min-w-0"><div className="text-[12px] font-bold text-txt-bright truncate">{lead.name}</div><div className="text-[10px] text-txt-ghost font-mono">{lead.phone}</div></div>
                      {lead.revenue > 0 && <span className="text-[10px] font-mono font-bold neon-mint">{formatCompact(lead.revenue)}</span>}
                      {o && <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-bold border border-white/5" style={{ background: `linear-gradient(135deg, ${o.color}25, ${o.color}08)`, color: o.color }}>{o.avatar || o.name?.substring(0,2).toUpperCase()}</div>}
                    </motion.div>
                  );
                })}
                {risky.length === 0 && <div className="text-center py-8 text-txt-ghost text-[12px]">✅ All clear!</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 min-h-0">
          <TeamSettings />
        </div>
      )}
    </div>
  );
}
