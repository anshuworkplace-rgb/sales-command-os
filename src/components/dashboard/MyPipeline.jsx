import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitBranch } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUIStore from '../../stores/useUIStore';
import { STAGE_ORDER, STAGE_LABELS, STAGE_COLORS } from '../../utils/constants';
import { calculateTemperature } from '../../engines/temperatureEngine';
import CountdownTimer from '../common/CountdownTimer';

export default function MyPipeline({ userId }) {
  const { leads } = useLeadStore();
  const { openLeadDetail } = useUIStore();
  const my = useMemo(() => userId ? leads.filter(l => l.assigned_to === userId) : leads, [leads, userId]);
  const groups = useMemo(() => STAGE_ORDER.map(s => ({ stage: s, label: STAGE_LABELS[s], leads: my.filter(l => l.status === s) })), [my]);

  return (
    <div className="glass-3d holo-shimmer p-5 flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-3 mb-5 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet/20 to-indigo/10 flex items-center justify-center">
          <GitBranch size={18} className="neon-violet" />
        </div>
        <div>
          <h2 className="text-[16px] font-black font-display text-txt-glow">My Pipeline</h2>
          <span className="text-[9px] text-txt-ghost uppercase tracking-[0.2em] font-bold">{my.length} leads total</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {groups.filter(g => g.leads.length > 0).map((g, gi) => (
          <motion.div key={g.stage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.06, duration: 0.4 }}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className={`w-2 h-2 rounded-full ${STAGE_COLORS[g.stage]?.dot || 'bg-txt-ghost'}`} />
              <span className="text-[12px] font-bold text-txt-bright">{g.label}</span>
              <span className="ml-auto text-[10px] font-mono font-bold text-txt-ghost bg-white/[0.02] px-2 py-0.5 rounded-md">{g.leads.length}</span>
            </div>
            <div className="space-y-1">
              {g.leads.map((lead) => {
                const temp = calculateTemperature(lead.lead_score || 0);
                const over = lead.next_follow_up && new Date(lead.next_follow_up) < new Date();
                
                // SLA status check
                let slaPulsingDot = null;
                if (['new', 'fresh_enquiry'].includes(lead.status)) {
                  const now = new Date();
                  const enq = new Date(lead.enquiry_date || lead.created_at);
                  const diffMins = (now - enq) / 60000;
                  if (diffMins > 15) {
                    slaPulsingDot = (
                      <span 
                        className="inline-block w-2 h-2 rounded-full bg-coral animate-pulse flex-shrink-0"
                        style={{ boxShadow: '0 0 8px #f43f5e' }}
                        title={`SLA Violation: untouched for ${Math.round(diffMins)}m (>15m)`}
                      />
                    );
                  } else {
                    slaPulsingDot = (
                      <span 
                        className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0"
                        style={{ boxShadow: '0 0 8px #fbbf24' }}
                        title={`SLA Urgent: untouched for ${Math.round(diffMins)}m (<=15m)`}
                      />
                    );
                  }
                }

                return (
                  <div key={lead.id} onClick={() => openLeadDetail(lead.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/[0.03] group ${over ? 'bg-rose/[0.03] border border-rose/10' : 'border border-transparent'}`}>
                    <div className={`w-1 h-8 rounded-full flex-shrink-0 ${temp === 'HOT' ? 'temp-hot' : temp === 'WARM' ? 'temp-warm' : 'temp-cold'}`}
                      style={{ boxShadow: temp === 'HOT' ? '0 0 6px rgba(255,77,106,0.3)' : temp === 'WARM' ? '0 0 6px rgba(255,190,10,0.3)' : '0 0 6px rgba(61,139,253,0.2)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-txt-bright truncate flex items-center gap-1.5">
                        {slaPulsingDot}
                        <span>{lead.name}</span>
                      </div>
                      <div className="text-[10px] text-txt-dim font-mono">{lead.phone}</div>
                    </div>
                    <CountdownTimer targetDate={lead.next_follow_up} compact />
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
