import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Users, TrendingUp, DollarSign, Activity, Flame } from 'lucide-react';
import useUserStore from '../../stores/useUserStore';
import useLeadStore from '../../stores/useLeadStore';
import { formatCurrency, formatCompact } from '../../utils/formatUtils';
import { identifyHotHand } from '../../engines/PredictiveEngine';

export default function TeamCommandPanel() {
  const { users, currentUserProfile } = useUserStore();
  const { leads } = useLeadStore();
  const [selectedRep, setSelectedRep] = useState(null);

  // Filter reps to only those managed by current user (if manager) or all (if admin)
  const myReps = useMemo(() => {
    if (!currentUserProfile) return [];
    if (currentUserProfile.role === 'admin') return users.filter(u => u.role === 'sales' || u.role === 'manager');
    return users.filter(u => u.manager_id === currentUserProfile.id || u.id === currentUserProfile.id);
  }, [users, currentUserProfile]);

  const teamMetrics = useMemo(() => {
    let totalTarget = 0;
    let totalPipeline = 0;
    let closedWon = 0;

    myReps.forEach(rep => {
      if (rep.role === 'sales') {
        totalTarget += Number(rep.monthly_target || 0);
      }
      const repLeads = leads.filter(l => l.assigned_to === rep.id);
      totalPipeline += repLeads.filter(l => l.status !== 'closed_lost' && l.status !== 'closed_won').reduce((sum, l) => sum + Number(l.revenue || 0), 0);
      closedWon += repLeads.filter(l => l.status === 'closed_won').reduce((sum, l) => sum + Number(l.revenue || 0), 0);
    });

    return { totalTarget, totalPipeline, closedWon, attainment: totalTarget ? (closedWon / totalTarget) * 100 : 0 };
  }, [myReps, leads]);

  const hotHand = useMemo(() => identifyHotHand(leads, myReps), [leads, myReps]);

  return (
    <div className="glass-3d holo-shimmer p-5 lg:p-6 mb-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[20px] font-black font-display text-txt-glow tracking-tight flex items-center gap-2">
            <Target className="text-cyan" size={24} /> TEAM COMMAND
          </h2>
          <span className="text-[11px] text-txt-ghost uppercase tracking-[0.2em] font-bold">God Mode Metrics</span>
        </div>
        
        {/* Top level metrics */}
        <div className="flex gap-4">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-2">
            <div className="text-[10px] text-txt-ghost font-bold uppercase tracking-wider mb-1">Squad Target</div>
            <div className="text-[16px] font-black text-cyan">{formatCompact(teamMetrics.totalTarget)}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-2">
            <div className="text-[10px] text-txt-ghost font-bold uppercase tracking-wider mb-1">Closed Won</div>
            <div className="text-[16px] font-black text-mint">{formatCompact(teamMetrics.closedWon)}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-2">
            <div className="text-[10px] text-txt-ghost font-bold uppercase tracking-wider mb-1">Attainment</div>
            <div className="text-[16px] font-black text-amber">{teamMetrics.attainment.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myReps.map(rep => {
          const repLeads = leads.filter(l => l.assigned_to === rep.id);
          const closed = repLeads.filter(l => l.status === 'closed_won').reduce((sum, l) => sum + Number(l.revenue || 0), 0);
          const target = Number(rep.monthly_target || 0);
          const progress = target > 0 ? Math.min((closed / target) * 100, 100) : 0;
          const isHot = hotHand && hotHand.repId === rep.id;
          
          return (
            <motion.div key={rep.id} whileHover={{ y: -2 }} className={`glass-3d p-4 border transition-all cursor-pointer relative overflow-hidden ${isHot ? 'border-rose/40 shadow-[0_0_15px_rgba(255,77,106,0.15)] bg-rose/[0.02]' : 'border-white/[0.05] hover:border-cyan/30'}`}>
              
              {isHot && (
                <div className="absolute top-0 right-0 bg-rose/20 text-rose px-2 py-0.5 rounded-bl-lg text-[9px] font-bold tracking-widest flex items-center gap-1 backdrop-blur-md">
                  <Flame size={10} /> HOT HAND
                </div>
              )}

              <div className="flex items-center justify-between mb-3 mt-1">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[13px] ${isHot ? 'bg-gradient-to-br from-rose/20 to-amber/20 text-rose border border-rose/30' : 'bg-white/5 text-txt-bright'}`}>
                    {rep.avatar || '👤'}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-txt-glow">{rep.name}</div>
                    <div className="text-[10px] text-txt-dim uppercase tracking-wider">{rep.role}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-black text-mint">{formatCompact(closed)}</div>
                  <div className="text-[10px] text-txt-ghost font-mono">/ {formatCompact(target)}</div>
                </div>
              </div>
              
              <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className={`h-full rounded-full ${progress >= 100 ? 'bg-mint shadow-[0_0_10px_rgba(0,255,170,0.5)]' : isHot ? 'bg-gradient-to-r from-amber to-rose' : progress >= 50 ? 'bg-amber' : 'bg-cyan'}`}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold text-txt-ghost">
                <span>{progress.toFixed(0)}% to Quota</span>
                <span>{repLeads.length} Leads</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
