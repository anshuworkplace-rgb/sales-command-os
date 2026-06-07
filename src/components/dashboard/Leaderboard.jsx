import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import { getUserPerformanceStats } from '../../engines/insightEngine';
import { formatCompact, formatPercent } from '../../utils/formatUtils';

export default function Leaderboard() {
  const { leads, activities } = useLeadStore();
  const { users } = useUserStore();
  
  const sales = users.filter(u => u.role === 'sales');
  const team = useMemo(() => 
    sales.map(u => ({ ...u, stats: getUserPerformanceStats(u.id, leads, activities) }))
         .sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue), 
  [leads, activities, sales]);

  return (
    <div className="space-y-4">
      <h3 className="text-[15px] font-black font-display text-txt-glow mb-4 flex items-center gap-2">
        <Shield size={17} className="neon-cyan" /> Live Leaderboard
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {team.map((u, i) => {
          const isTop = i === 0;
          const h = u.stats.overdue === 0 ? 'mint' : u.stats.overdue <= 2 ? 'amber' : 'rose';
          const userTarget = Number(u.monthly_target || 150000);
          const pct = userTarget > 0 ? Math.min(100, (u.stats.totalRevenue / userTarget) * 100) : 0;
          
          // XP / Level System
          const xp = (u.stats.followUpsCompleted * 10) + (u.stats.totalRevenue / 1000);
          const level = xp >= 500 ? 'PLATINUM' : xp >= 300 ? 'GOLD' : xp >= 150 ? 'SILVER' : 'BRONZE';
          const levelColor = { PLATINUM: '#E5E4E2', GOLD: '#FFD700', SILVER: '#C0C0C0', BRONZE: '#CD7F32' }[level];
          
          return (
            <motion.div key={u.id} initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: [0.23,1,0.32,1] }}
              className={`glass-3d p-5 holo-shimmer transition-all relative overflow-hidden ${
                isTop ? 'border border-amber/30 shadow-[0_0_20px_rgba(255,190,10,0.15)] bg-gradient-to-b from-amber/[0.05] to-transparent' : ''
              }`}>
              
              {isTop && <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber/20 blur-2xl rounded-full" />}

              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <span className={`text-[16px] font-black font-display ${isTop ? 'text-amber drop-shadow-[0_0_5px_rgba(255,190,10,0.5)]' : 'text-txt-ghost'}`}>
                    #{i + 1}
                  </span>
                  {u.stats.streak > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose bg-rose/10 px-1.5 py-0.5 rounded border border-rose/20">
                      🔥 {u.stats.streak}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black font-mono tracking-wider px-1.5 py-0.5 rounded border" style={{ color: levelColor, borderColor: `${levelColor}40`, background: `${levelColor}10` }}>{level}</span>
                  <div className={`w-2.5 h-2.5 rounded-full bg-${h} ${h === 'rose' ? 'pulse-glow' : ''}`} style={{ boxShadow: `0 0 8px ${h === 'mint' ? 'rgba(0,255,178,0.4)' : h === 'amber' ? 'rgba(255,190,10,0.4)' : 'rgba(255,77,106,0.4)'}` }} />
                </div>
              </div>
              
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[14px] font-black ${isTop ? 'border-amber/40 shadow-[0_0_15px_rgba(255,190,10,0.2)]' : ''}`}
                  style={{ background: isTop ? `linear-gradient(135deg, rgba(255,190,10,0.2), transparent)` : `linear-gradient(135deg, ${u.color}25, ${u.color}08)`, color: isTop ? '#ffbe0a' : u.color, border: !isTop ? `1px solid ${u.color}20` : undefined }}>
                  {u.avatar || u.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className={`text-[15px] font-black tracking-wide ${isTop ? 'text-amber' : 'text-txt-glow'}`}>{u.name}</div>
                  <div className="text-[10px] text-txt-dim font-mono">{u.stats.totalLeads} leads • {Math.round(xp)} XP</div>
                </div>
              </div>
              
              <div className="mb-4 relative z-10 bg-void/30 p-2.5 rounded-lg border border-white/[0.02]">
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[10px] font-bold text-txt-ghost uppercase tracking-wider">Revenue</span>
                  <span className="text-[16px] font-black font-mono neon-mint">{formatCompact(u.stats.totalRevenue)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.4 + i * 0.06 }}
                    className="h-full rounded-full" style={{ background: pct >= 100 ? 'linear-gradient(90deg,#00ffb2,#00e5ff)' : pct >= 50 ? 'linear-gradient(90deg,#00e5ff,#3d8bfd)' : 'linear-gradient(90deg,#ffbe0a,#ff4d6a)', boxShadow: `0 0 8px ${pct >= 100 ? 'rgba(0,255,178,0.3)' : pct >= 50 ? 'rgba(0,229,255,0.3)' : 'rgba(255,190,10,0.3)'}` }} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-y-2 text-[11px] relative z-10">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-txt-ghost uppercase tracking-wider">Follow-ups</span>
                  <span className="text-cyan font-mono font-black">{u.stats.followUpsCompleted} done</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-txt-ghost uppercase tracking-wider">Conversion</span>
                  <span className="text-txt-bright font-mono font-black">{formatPercent(u.stats.conversionRate)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
