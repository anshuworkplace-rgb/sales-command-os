import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import AnimatedCounter from '../common/AnimatedCounter';
import { formatDuration } from '../../utils/dateUtils';

export default function QuickStats({ userId }) {
  const { leads } = useLeadStore();
  const my = useMemo(() => userId ? leads.filter(l => l.assigned_to === userId) : leads, [leads, userId]);

  const stats = useMemo(() => {
    const now = new Date();
    const active = my.filter(l => !['closed_won', 'closed_lost'].includes(l.status));
    const due = active.filter(l => { if (!l.next_follow_up) return false; const d = new Date(l.next_follow_up); return d.toDateString() === now.toDateString() && d >= now; }).length;
    const over = active.filter(l => l.next_follow_up && new Date(l.next_follow_up) < now).length;
    const hot = active.filter(l => l.status === 'interested').length;
    const rts = my.filter(l => l.first_contact_at && l.created_at).map(l => (new Date(l.first_contact_at) - new Date(l.created_at)) / 60000);
    const avg = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
    return [
      { label: 'Due Today', val: due, icon: Clock, neon: 'neon-cyan', stripe: 'stripe-cyan', glow: due > 0 ? 'shadow-neon-cyan' : '' },
      { label: 'Overdue', val: over, icon: AlertTriangle, neon: over > 0 ? 'neon-rose' : 'neon-mint', stripe: over > 0 ? 'stripe-rose' : 'stripe-cyan', glow: over > 0 ? 'shadow-neon-rose' : '', pulse: over > 0 },
      { label: 'Hot Leads', val: hot, icon: TrendingUp, neon: 'neon-amber', stripe: 'stripe-amber', glow: '' },
      { label: 'Avg Response', val: formatDuration(avg), icon: Zap, neon: 'neon-violet', stripe: 'stripe-violet', glow: '', isText: true },
    ];
  }, [my]);

  return (
    <div className="grid grid-cols-4 gap-3 h-full">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.23,1,0.32,1] }}
            className={`glass-3d ${s.stripe} p-4 flex flex-col justify-between ${s.glow} ${s.pulse ? 'overdue-card' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.03] flex items-center justify-center backdrop-blur-sm">
                <Icon size={17} className={s.neon} />
              </div>
              <span className="text-[9px] text-txt-ghost uppercase tracking-[0.15em] font-bold">{s.label}</span>
            </div>
            {s.isText ? (
              <div className={`text-[26px] font-black font-display tabular-nums ${s.neon}`}>{s.val}</div>
            ) : (
              <AnimatedCounter value={s.val} className={`text-[26px] font-black font-display tabular-nums ${s.neon}`} />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
