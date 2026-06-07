import { useMemo } from 'react';
import { motion } from 'framer-motion';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import AnimatedCounter from '../common/AnimatedCounter';
import { formatCompact } from '../../utils/formatUtils';

export default function TargetRing({ userId }) {
  const { leads } = useLeadStore();
  const { users } = useUserStore();
  
  // Calculate dynamic target based on users
  const targetMax = useMemo(() => {
    if (userId) {
      const u = users.find(x => x.id === userId);
      return Number(u?.monthly_target || 150000);
    } else {
      // Squad aggregate: Only sum up actual sales reps to avoid counting manager targets
      const salesReps = users.filter(u => u.role === 'sales');
      return salesReps.reduce((sum, u) => sum + Number(u.monthly_target || 0), 0) || 150000;
    }
  }, [users, userId]);

  const my = useMemo(() => userId ? leads.filter(l => l.assigned_to === userId) : leads, [leads, userId]);
  const rev = my.reduce((s, l) => s + (Number(l.revenue) || 0), 0);
  const conv = my.filter(l => l.status === 'converted').length;
  const pct = targetMax > 0 ? Math.min(100, (rev / targetMax) * 100) : 0;
  const r = 62, circ = 2 * Math.PI * r, off = circ - (pct / 100) * circ;
  const color = pct >= 100 ? '#00ffb2' : pct >= 66 ? '#00e5ff' : pct >= 33 ? '#ffbe0a' : '#ff4d6a';

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.23,1,0.32,1] }}
      className="glass-3d gradient-border holo-shimmer p-6 flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width="150" height="150" className="progress-ring">
          <circle cx="75" cy="75" r={r} className="ring-bg" strokeWidth="6" />
          <circle cx="75" cy="75" r={r} className="ring-glow" strokeWidth="10" stroke={color}
            strokeDasharray={circ} strokeDashoffset={off} />
          <circle cx="75" cy="75" r={r} className="ring-fill" strokeWidth="6" stroke={color}
            strokeDasharray={circ} strokeDashoffset={off} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedCounter value={pct} suffix="%" className="text-[30px] font-black font-display tabular-nums" style={{ color }} />
          <span className="text-[9px] text-txt-ghost uppercase tracking-[0.2em] font-bold mt-0.5">of target</span>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        <div>
          <span className="text-[10px] text-txt-ghost uppercase tracking-[0.15em] font-bold block mb-1">Monthly Revenue</span>
          <div className="text-[34px] font-black font-display tabular-nums leading-none neon-cyan">
            {formatCompact(rev)}
          </div>
        </div>
        <div className="flex gap-5">
          <div>
            <span className="text-[9px] text-txt-ghost uppercase tracking-wider block mb-0.5">Target</span>
            <span className="text-[13px] font-bold font-mono text-txt-dim">{formatCompact(targetMax)}</span>
          </div>
          <div>
            <span className="text-[9px] text-txt-ghost uppercase tracking-wider block mb-0.5">Conversions</span>
            <span className="text-[13px] font-bold font-mono neon-mint">{conv}</span>
            <span className="text-[9px] text-txt-ghost ml-1">Closed</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-white/[0.03] overflow-hidden relative">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.5, delay: 0.4, ease: [0.23,1,0.32,1] }}
            className="h-full rounded-full relative" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)`, boxShadow: `0 0 12px ${color}40` }} />
        </div>
        <div className="flex justify-between text-[9px] text-txt-ghost font-mono font-bold"><span>₹0</span><span>{formatCompact(targetMax / 2)}</span><span>{formatCompact(targetMax)}</span></div>
      </div>
    </motion.div>
  );
}
