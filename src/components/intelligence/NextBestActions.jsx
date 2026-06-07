import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUIStore from '../../stores/useUIStore';
import useUserStore from '../../stores/useUserStore';
import { getNextBestActions, getRecommendedAction } from '../../engines/priorityEngine';
import { calculateTemperature } from '../../engines/temperatureEngine';
import TemperatureBadge from '../common/TemperatureBadge';
import CountdownTimer from '../common/CountdownTimer';

export default function NextBestActions() {
  const { leads, activities, completeFollowUp } = useLeadStore();
  const { openLeadDetail } = useUIStore();
  const { getUserById } = useUserStore();

  const topLeads = useMemo(() => getNextBestActions(leads, activities, 5), [leads, activities]);

  return (
    <div className="rounded-2xl bg-surface-card/60 border border-white/[0.04] p-4">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-amber/20 to-accent-orange/10 flex items-center justify-center">
          <Zap size={16} className="text-accent-amber" />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-txt-bright">Next Best Actions</h3>
          <span className="text-[10px] text-txt-muted">AI Priority Queue</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {topLeads.map((lead, i) => {
          const temperature = calculateTemperature(lead, activities.filter(a => a.leadId === lead.id).length);
          const user = getUserById(lead.assignedTo);
          const action = getRecommendedAction(lead);
          const isOverdue = lead.nextFollowUp && new Date(lead.nextFollowUp) < new Date();

          return (
            <motion.div key={lead.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
              onClick={() => openLeadDetail(lead.id)}
              className={`p-3 rounded-xl cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 ${
                isOverdue
                  ? 'bg-accent-rose/[0.06] border border-accent-rose/15 hover:bg-accent-rose/[0.1]'
                  : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05]'
              }`}>
              <div className="flex items-start gap-2.5">
                {/* Rank */}
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 mt-0.5 ${
                  i === 0 ? 'bg-gradient-to-br from-accent-rose/20 to-accent-rose/5 text-accent-rose' :
                  i === 1 ? 'bg-gradient-to-br from-accent-amber/20 to-accent-amber/5 text-accent-amber' :
                  'bg-white/[0.04] text-txt-muted'
                }`}>{i + 1}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[12px] font-bold text-txt-bright truncate">{lead.name}</span>
                    <TemperatureBadge temperature={temperature} size="xs" />
                  </div>

                  <div className="text-[10px] text-txt-secondary mb-2 leading-relaxed">{action}</div>

                  <div className="flex items-center justify-between">
                    <CountdownTimer targetDate={lead.nextFollowUp} compact />
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold"
                        style={{ background: `${user?.color}15`, color: user?.color }}>{user?.avatar}</div>
                      <button onClick={(e) => { e.stopPropagation(); completeFollowUp(lead.id); }}
                        className="text-[9px] px-2 py-0.5 rounded-lg bg-accent-emerald/10 text-accent-emerald font-semibold opacity-0 group-hover:opacity-100 transition-all hover:bg-accent-emerald/20">
                        Done ✓
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Bar */}
              <div className="mt-2.5 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  lead.priorityScore > 70 ? 'bg-gradient-to-r from-accent-rose to-accent-orange' :
                  lead.priorityScore > 40 ? 'bg-gradient-to-r from-accent-amber to-accent-orange' :
                  'bg-gradient-to-r from-accent-sky to-accent-violet'
                }`} style={{ width: `${lead.priorityScore}%` }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
