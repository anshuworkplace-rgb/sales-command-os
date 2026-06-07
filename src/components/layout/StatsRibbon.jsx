import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, Clock, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import { formatCompact, formatPercent } from '../../utils/formatUtils';
import { formatDuration } from '../../utils/dateUtils';

export default function StatsRibbon() {
  const { leads, activities } = useLeadStore();

  const stats = useMemo(() => {
    const now = new Date();
    const activeLeads = leads.filter(l => l.status !== 'CLOSED');
    const converted = leads.filter(l => ['PAYMENT_DONE', 'UPGRADE'].includes(l.status));
    const totalRevenue = leads.reduce((sum, l) => sum + (l.revenue || 0), 0);
    const dueToday = activeLeads.filter(l => {
      if (!l.nextFollowUp) return false;
      const fu = new Date(l.nextFollowUp);
      return fu.toDateString() === now.toDateString() && fu >= now;
    }).length;
    const overdue = activeLeads.filter(l => l.nextFollowUp && new Date(l.nextFollowUp) < now).length;
    const totalNonNew = leads.filter(l => l.status !== 'NEW').length;
    const conversionRate = totalNonNew > 0 ? (converted.length / totalNonNew) * 100 : 0;
    const responseTimes = leads.filter(l => l.firstContactAt && l.createdAt).map(l => (new Date(l.firstContactAt) - new Date(l.createdAt)) / 60000);
    const avgResponse = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

    return [
      { label: 'Revenue', value: formatCompact(totalRevenue), sub: `${converted.length} deals closed`, icon: IndianRupee, variant: 'emerald', iconBg: 'from-emerald-500/20 to-emerald-400/5' },
      { label: 'Due Today', value: String(dueToday), sub: 'follow-ups pending', icon: Clock, variant: 'sky', iconBg: 'from-sky-500/20 to-sky-400/5' },
      { label: 'Overdue', value: String(overdue), sub: overdue > 0 ? 'need action now!' : 'all clear ✓', icon: AlertTriangle, variant: overdue > 0 ? 'rose' : 'emerald', iconBg: overdue > 0 ? 'from-rose-500/20 to-rose-400/5' : 'from-emerald-500/20 to-emerald-400/5', pulse: overdue > 0 },
      { label: 'Conversion', value: formatPercent(conversionRate), sub: `${converted.length} of ${totalNonNew || leads.length}`, icon: TrendingUp, variant: 'violet', iconBg: 'from-violet-500/20 to-violet-400/5' },
      { label: 'Avg Response', value: formatDuration(avgResponse), sub: 'to first contact', icon: Zap, variant: 'amber', iconBg: 'from-amber-500/20 to-amber-400/5' },
    ];
  }, [leads, activities]);

  return (
    <div className="grid grid-cols-5 gap-4 px-5 py-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className={`stat-card stat-card-${stat.variant} ${stat.pulse ? 'overdue-pulse' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${stat.iconBg}`}>
                <Icon size={18} className={`text-accent-${stat.variant}`} />
              </div>
              <span className="text-[11px] text-txt-muted font-medium">{stat.label}</span>
            </div>
            <div className={`text-[28px] font-extrabold font-mono tabular-nums stat-value leading-none mb-1`}>
              {stat.value}
            </div>
            <div className="text-[11px] text-txt-muted">{stat.sub}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
