import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, ChevronLeft, ChevronRight, Calendar, CreditCard, Phone, MessageCircle } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUIStore from '../../stores/useUIStore';
import useUserStore from '../../stores/useUserStore';
import { getRecommendedAction } from '../../engines/priorityEngine';
import { calculateTemperature } from '../../engines/temperatureEngine';
import { calculateConfidenceScore } from '../../engines/PredictiveEngine';
import TemperatureBadge from '../common/TemperatureBadge';
import CountdownTimer from '../common/CountdownTimer';
import { STAGE_LABELS, NEXT_STAGE, MESSAGE_TEMPLATES } from '../../utils/constants';

export default function FocusMode() {
  const { activePage, setActivePage } = useUIStore();
  const isFocusModeActive = activePage === 'focus';
  const exitFocusMode = () => setActivePage('home');
  const { leads, activities, completeFollowUp, changeStage, addNote } = useLeadStore();
  const { getCurrentUser } = useUserStore();
  const user = getCurrentUser();
  const [idx, setIdx] = useState(0);
  const [note, setNote] = useState('');
  
  // Filter and sort: my leads, prioritized by AI Confidence Score desc
  const focusLeads = useMemo(() => {
    const myLeads = ['manager', 'admin'].includes(user?.role) ? leads : leads.filter(l => l.assigned_to === user?.id);
    return [...myLeads]
      .filter(l => !['closed_won', 'closed_lost'].includes(l.status))
      .map(l => ({ ...l, ai_score: calculateConfidenceScore(l, activities) }))
      .sort((a, b) => b.ai_score - a.ai_score)
      .slice(0, 10);
  }, [leads, activities, user]);

  if (!isFocusModeActive || !focusLeads.length) return null;
  
  const lead = focusLeads[Math.min(idx, focusLeads.length - 1)];
  const temp = calculateTemperature(lead.lead_score || 0);
  const action = getRecommendedAction(lead);
  const over = lead.next_follow_up && new Date(lead.next_follow_up) < new Date();
  const nextStage = NEXT_STAGE[lead.status];
  const waTemplate = MESSAGE_TEMPLATES[lead.status];
  const waLink = `https://wa.me/${lead.phone?.replace(/[^0-9]/g, '')}`;
  const waTemplateLink = waTemplate ? `${waLink}?text=${encodeURIComponent(waTemplate.template(lead.name))}` : waLink;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 focus-bg flex items-center justify-center">
        <div className="absolute top-6 right-6 flex items-center gap-4">
          <span className="text-[12px] text-txt-ghost font-mono font-bold">{idx + 1}/{focusLeads.length}</span>
          <button onClick={() => { exitFocusMode(); setIdx(0); }} className="flex items-center gap-2 px-4 py-2 rounded-xl glass-3d text-[13px] text-txt-dim hover:bg-white/[0.06] transition-all"><X size={16} />Exit</button>
        </div>
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan/20 to-violet/10 flex items-center justify-center shadow-neon-cyan breathe"><Target size={22} className="neon-cyan" /></div>
          <div><span className="text-[15px] font-black font-display text-txt-glow block">FOCUS MODE</span><span className="text-[9px] text-txt-ghost tracking-[0.25em] uppercase font-bold">Deep Work</span></div>
        </div>
        
        <motion.div key={lead.id} initial={{ opacity: 0, scale: 0.93, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-xl">
          <div className="glass-3d gradient-border holo-shimmer p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-[32px] font-black font-display text-txt-glow tracking-tight">{lead.name}</h2>
              <div className="flex items-center justify-center gap-4 mt-3">
                <div className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] tracking-wider uppercase flex items-center gap-1.5 
                  ${lead.ai_score >= 80 ? 'bg-mint/10 border-mint/20 text-mint' : 
                    lead.ai_score >= 50 ? 'bg-amber/10 border-amber/20 text-amber' : 
                    'bg-rose/10 border-rose/20 text-rose'}`}>
                  <Target size={12} /> {lead.ai_score}% CONFIDENCE
                </div>
                <span className="text-[15px] text-txt-dim font-mono">{lead.phone}</span>
                <span className="text-[11px] font-bold text-txt-ghost px-2.5 py-1 bg-white/[0.02] rounded-lg">{STAGE_LABELS[lead.status]}</span>
              </div>
            </div>
            
            <div className={`glass-3d p-4 text-center ${over ? 'overdue-card shadow-neon-rose' : ''}`}>
              <CountdownTimer targetDate={lead.next_follow_up} />
            </div>
            
            <div className="glass-3d p-4 text-center stripe-amber">
              <span className="text-[14px] neon-amber font-bold">💡 {action}</span>
            </div>
            
            {lead.notes && <div className="glass-3d p-4"><p className="text-[13px] text-txt-primary leading-relaxed italic">&ldquo;{lead.notes}&rdquo;</p></div>}
            
            <div className="grid grid-cols-4 gap-2.5">
              <a href={waTemplateLink} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-mint/10 border border-mint/15 text-mint hover:bg-mint/15 hover:shadow-neon-mint transition-all">
                <MessageCircle size={22} /><span className="text-[10px] font-bold">{waTemplate ? waTemplate.label : 'WhatsApp'}</span>
              </a>
              {nextStage && <button onClick={() => changeStage(lead.id, nextStage)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-cyan/10 border border-cyan/15 text-cyan hover:bg-cyan/15 hover:shadow-neon-cyan transition-all"><ChevronRight size={22} /><span className="text-[10px] font-bold">{STAGE_LABELS[nextStage]}</span></button>}
              <button onClick={() => completeFollowUp(lead.id)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-violet/10 border border-violet/15 text-violet hover:bg-violet/15 hover:shadow-neon-violet transition-all"><Calendar size={22} /><span className="text-[10px] font-bold">Complete</span></button>
              <button onClick={() => changeStage(lead.id, 'payment_done')} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-mint/10 border border-mint/15 text-mint hover:bg-mint/15 hover:shadow-neon-mint transition-all"><CreditCard size={22} /><span className="text-[10px] font-bold">Payment</span></button>
            </div>
            
            <div className="flex gap-2">
              <input type="text" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && note.trim()) { addNote(lead.id, note.trim()); setNote(''); } }} placeholder="Quick note..." className="flex-1 bg-input border border-white/[0.04] rounded-xl px-4 py-3 text-[14px] text-txt-glow outline-none focus:border-cyan/30 placeholder:text-txt-ghost" />
              <button onClick={() => { if (note.trim()) { addNote(lead.id, note.trim()); setNote(''); } }} className="px-6 py-3 bg-white/[0.03] border border-white/[0.03] rounded-xl text-[14px] font-bold text-txt-glow hover:bg-white/[0.06] transition-all">Save</button>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-6 px-4">
            <button onClick={() => idx > 0 && setIdx(i => i - 1)} disabled={idx === 0} className="flex items-center gap-2 px-5 py-3 rounded-xl glass-3d text-[13px] font-bold text-txt-dim hover:text-txt-glow disabled:opacity-30 transition-all"><ChevronLeft size={18} />Prev</button>
            <button onClick={() => idx < focusLeads.length - 1 && setIdx(i => i + 1)} disabled={idx >= focusLeads.length - 1} className="flex items-center gap-2 px-5 py-3 rounded-xl glass-3d text-[13px] font-bold text-txt-dim hover:text-txt-glow disabled:opacity-30 transition-all">Next<ChevronRight size={18} /></button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
