import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3, AlertTriangle, Users, Lightbulb } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUIStore from '../../stores/useUIStore';
import useUserStore from '../../stores/useUserStore';
import { generateInsights, getUserPerformanceStats } from '../../engines/insightEngine';
import { formatCompact, formatPercent } from '../../utils/formatUtils';
import { formatDuration } from '../../utils/dateUtils';

export default function ManagerPanel() {
  const { isManagerPanelOpen, closeManagerPanel } = useUIStore();
  const { leads, activities } = useLeadStore();
  const { users } = useUserStore();
  const salesUsers = users.filter(u => u.role === 'sales');

  const insights = useMemo(() => generateInsights(leads, activities, users), [leads, activities, users]);
  const userStats = useMemo(() => salesUsers.map(u => ({ ...u, stats: getUserPerformanceStats(u.id, leads, activities) })), [leads, activities, salesUsers]);

  const totalRevenue = leads.reduce((s, l) => s + (l.revenue || 0), 0);
  const riskyLeads = useMemo(() => {
    const now = new Date();
    return leads.filter(l => {
      if (l.status === 'CLOSED') return false;
      const h = l.lastInteractionAt ? (now - new Date(l.lastInteractionAt)) / 3600000 : 999;
      return h > 48 || (l.nextFollowUp && new Date(l.nextFollowUp) < new Date(now - 86400000));
    }).slice(0, 5);
  }, [leads]);

  if (!isManagerPanelOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md" onClick={closeManagerPanel} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed right-0 top-0 bottom-0 w-[540px] z-50 bg-surface-elevated border-l border-white/[0.06] shadow-2xl overflow-y-auto">
        
        <div className="sticky top-0 z-10 bg-surface-elevated/80 backdrop-blur-2xl border-b border-white/[0.06] p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-sky/10 flex items-center justify-center border border-accent-violet/20 shadow-glow-sky">
              <BarChart3 size={20} className="text-accent-violet" />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-txt-bright leading-tight">Manager Control</h2>
              <span className="text-[11px] text-txt-muted uppercase tracking-widest font-semibold">Team Oversight</span>
            </div>
          </div>
          <button onClick={closeManagerPanel} className="p-2 rounded-xl hover:bg-white/[0.05] text-txt-secondary transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-6">
          {/* Revenue Summary */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-accent-emerald/10 to-accent-emerald/5 border border-accent-emerald/20 text-center shadow-glow-emerald">
            <span className="text-[13px] text-accent-emerald font-semibold uppercase tracking-wider">Total Team Revenue</span>
            <div className="text-[40px] font-extrabold font-mono text-accent-emerald mt-1 leading-none">{formatCompact(totalRevenue)}</div>
          </div>

          {/* Team Health Grid */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Users size={16} className="text-txt-secondary" /><span className="text-[14px] font-bold text-txt-bright">Team Health</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {userStats.sort((a, b) => a.stats.overdue - b.stats.overdue).map((u, i) => {
                const health = u.stats.overdue === 0 ? 'green' : u.stats.overdue <= 2 ? 'amber' : 'red';
                const styles = {
                  green: 'border-accent-emerald/20 bg-accent-emerald/[0.05]',
                  amber: 'border-accent-amber/20 bg-accent-amber/[0.05]',
                  red: 'border-accent-rose/20 bg-accent-rose/[0.05]',
                };
                return (
                  <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className={`p-4 rounded-xl border ${styles[health]}`}>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm" style={{ background: `${u.color}20`, color: u.color }}>{u.avatar}</div>
                      <span className="text-[13px] font-bold text-txt-bright">{u.name.split(' ')[0]}</span>
                      <div className={`ml-auto w-2 h-2 rounded-full ${health === 'green' ? 'bg-accent-emerald shadow-glow-emerald' : health === 'amber' ? 'bg-accent-amber shadow-glow-amber' : 'bg-accent-rose animate-pulse shadow-glow-rose'}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[11px]">
                      <div><span className="text-txt-muted block mb-0.5">Revenue</span> <span className="text-txt-primary font-mono font-semibold">{formatCompact(u.stats.totalRevenue)}</span></div>
                      <div><span className="text-txt-muted block mb-0.5">Overdue</span> <span className={`${u.stats.overdue > 0 ? 'text-accent-rose font-extrabold' : 'text-txt-primary font-semibold'}`}>{u.stats.overdue}</span></div>
                      <div><span className="text-txt-muted block mb-0.5">Conv%</span> <span className="text-txt-primary font-mono font-semibold">{formatPercent(u.stats.conversionRate)}</span></div>
                      <div><span className="text-txt-muted block mb-0.5">Resp Time</span> <span className="text-txt-primary font-mono font-semibold">{u.stats.avgResponseTime ? formatDuration(u.stats.avgResponseTime) : '—'}</span></div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Insights */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Lightbulb size={16} className="text-accent-amber" /><span className="text-[14px] font-bold text-txt-bright">AI Insights & Signals</span>
            </div>
            <div className="space-y-3">
              {insights.slice(0, 6).map((insight, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className={`p-4 rounded-xl border ${insight.type === 'danger' ? 'border-accent-rose/20 bg-accent-rose/[0.05]' : insight.type === 'warning' ? 'border-accent-amber/20 bg-accent-amber/[0.05]' : insight.type === 'success' ? 'border-accent-emerald/20 bg-accent-emerald/[0.05]' : 'border-accent-sky/20 bg-accent-sky/[0.05]'}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-[18px] mt-0.5 leading-none">{insight.icon}</span>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold text-txt-bright mb-1">{insight.title}</div>
                      <div className="text-[12px] text-txt-secondary leading-relaxed">{insight.description}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Leads at Risk */}
          {riskyLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <AlertTriangle size={16} className="text-accent-rose" /><span className="text-[14px] font-bold text-txt-bright">Leads at Risk</span>
              </div>
              <div className="space-y-2">
                {riskyLeads.map(lead => {
                  const u = users.find(x => x.id === lead.assignedTo);
                  return (
                    <div key={lead.id} className="flex items-center gap-3 p-3 rounded-xl border border-accent-rose/15 bg-accent-rose/[0.05]">
                      <div className="w-2.5 h-2.5 rounded-full bg-accent-rose animate-pulse shadow-glow-rose flex-shrink-0" />
                      <span className="text-[13px] font-semibold text-txt-bright flex-1 truncate">{lead.name}</span>
                      {lead.revenue > 0 && <span className="text-[11px] font-mono font-bold text-accent-emerald">{formatCompact(lead.revenue)}</span>}
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-white/[0.04] text-txt-muted">{u?.name?.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
