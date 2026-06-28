import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, IndianRupee, User, Clock, Building, 
  ShieldAlert, Award, Calendar, ChevronRight, Check, X,
  AlertTriangle, PhoneOff, MessageSquareX, Frown,
  PhoneCall, Zap
} from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import { BROKERS, TRADING_EXPERIENCE, AGE_GROUPS, STAGES, QUICK_DISPOSITIONS } from '../../utils/constants';
import { inferFollowUpFromFeedback } from '../../engines/aiDecisionEngine';

// Animation variants for staggering cards
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function LeadDrawerOverview({ lead, ai }) {
  const { updateLead, rescheduleFollowUp } = useLeadStore();
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({
    city: lead?.city || '',
    capital: lead?.capital || '',
    broker: lead?.broker || '',
    trading_experience: lead?.trading_experience || '',
  });
  
  // Custom Date toggle
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customDateValue, setCustomDateValue] = useState('');

  const saveMeta = async () => {
    await updateLead(lead.id, metaForm);
    setIsEditingMeta(false);
  };

  const setSmartFollowUp = async (type) => {
    const now = new Date();
    let target = new Date();
    
    if (type === '2h') {
      target.setHours(now.getHours() + 2);
    } else if (type === 'tomorrow_am') {
      target.setDate(now.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else if (type === 'tomorrow_pm') {
      target.setDate(now.getDate() + 1);
      target.setHours(16, 0, 0, 0);
    } else if (type === 'next_week') {
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      target.setDate(now.getDate() + daysUntilMonday);
      target.setHours(10, 0, 0, 0);
    }

    await rescheduleFollowUp(lead.id, target.toISOString(), null, `Scheduled for ${type.replace('_', ' ')}`);
  };

  const handleCustomFollowUp = async () => {
    if (!customDateValue) return;
    await rescheduleFollowUp(lead.id, new Date(customDateValue).toISOString(), null, "Custom schedule");
    setShowCustomDate(false);
    setCustomDateValue('');
  };

  const handleAutoFollowUp = async () => {
    const inferred = inferFollowUpFromFeedback(lead.notes || lead.follow_up_note, lead.status);
    await rescheduleFollowUp(lead.id, inferred.date, null, inferred.note);
  };

  const handleDisposition = async (value) => {
    const updates = { disposition: value };
    if (['wrong_inquiry', 'not_interested', 'unreachable', 'no_whatsapp'].includes(value)) {
      updates.status = STAGES.LOST;
    } else if (value === 'npc') {
      updates.status = STAGES.NPC_RETRY;
    }
    await updateLead(lead.id, updates);
  };

  // Check if overdue
  const isOverdue = lead.next_follow_up && new Date(lead.next_follow_up) < new Date();

  return (
    <motion.div 
      className="space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* 1. AI Decision Box (Neon Glassmorphic) */}
      {ai?.nba && (
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-xl p-4" style={{
          background: 'rgba(5, 8, 16, 0.4)',
          border: `1px solid ${ai.triageMeta.color || 'var(--accent-blue)'}40`,
          boxShadow: `0 8px 32px ${ai.triageMeta.color || 'var(--accent-blue)'}10`,
        }}>
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-32 h-32 blur-[50px] opacity-20 pointer-events-none"
               style={{ background: ai.triageMeta.color, transform: 'translate(30%, -30%)' }} />
          
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[12px]">🤖</span>
                <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: ai.triageMeta.color || 'var(--accent-blue)' }}>
                  AI Decision
                </h4>
              </div>
              <p className="text-[14px] font-bold text-bright leading-tight">
                {ai.nba.icon} {ai.nba.label}
              </p>
              {ai.nba.detail && (
                <p className="text-[12px] text-dim mt-1 max-w-[280px]">
                  {ai.nba.detail}
                </p>
              )}
            </div>
            
            {/* Action button inside AI box */}
            <button
              onClick={handleAutoFollowUp}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:scale-105"
              style={{
                background: `${ai.triageMeta.color || 'var(--accent-blue)'}20`,
                color: ai.triageMeta.color || 'var(--accent-blue)',
                border: `1px solid ${ai.triageMeta.color || 'var(--accent-blue)'}40`
              }}
            >
              <Zap size={12} /> Execute
            </button>
          </div>
        </motion.div>
      )}

      {/* 2. Smart Follow-Up Module */}
      <motion.div variants={itemVariants} className="rounded-xl p-4" style={{
        background: 'var(--bg-raised)',
        border: `1px solid ${isOverdue ? 'rgba(244,63,94,0.3)' : 'var(--border-subtle)'}`,
        boxShadow: isOverdue ? '0 0 20px rgba(244,63,94,0.1)' : 'none'
      }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost flex items-center gap-2">
            <Calendar size={13} /> Follow-Up Schedule
          </h4>
          {lead.next_follow_up && (
            <span className={`text-[10px] font-bold mono px-2 py-0.5 rounded-full ${isOverdue ? 'bg-rose/10 text-rose border border-rose/20' : 'bg-blue/10 text-blue border border-blue/20'}`}>
              {isOverdue ? 'OVERDUE' : 'SCHEDULED'}
            </span>
          )}
        </div>

        {/* Current scheduled time display */}
        {lead.next_follow_up && (
          <div className="mb-4 p-3 rounded-lg flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div>
              <p className="text-[13px] font-bold text-bright mono">
                {new Date(lead.next_follow_up).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
              {lead.follow_up_note && (
                <p className="text-[11px] text-dim mt-0.5 italic">"{lead.follow_up_note}"</p>
              )}
            </div>
          </div>
        )}

        {/* Smart Chiclets */}
        {!showCustomDate ? (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSmartFollowUp('2h')} className="chiclet-btn">
              +2 Hours
            </button>
            <button onClick={() => setSmartFollowUp('tomorrow_am')} className="chiclet-btn">
              Tmrw 10 AM
            </button>
            <button onClick={() => setSmartFollowUp('tomorrow_pm')} className="chiclet-btn">
              Tmrw 4 PM
            </button>
            <button onClick={() => setShowCustomDate(true)} className="chiclet-btn ghost">
              Custom Date...
            </button>
          </div>
        ) : (
          <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
            <input
              type="datetime-local"
              value={customDateValue}
              onChange={e => setCustomDateValue(e.target.value)}
              className="input-v2 flex-1 text-[12px]"
            />
            <button onClick={handleCustomFollowUp} className="action-btn primary px-3" disabled={!customDateValue}>
              <Check size={14} />
            </button>
            <button onClick={() => setShowCustomDate(false)} className="action-btn px-3" style={{ background: 'var(--bg-card)' }}>
              <X size={14} className="text-ghost" />
            </button>
          </div>
        )}
      </motion.div>

      {/* 3. Categorized Dispositions */}
      <motion.div variants={itemVariants} className="rounded-xl p-4" style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-subtle)',
      }}>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost mb-3">
          Quick Dispositions
        </h4>
        
        <div className="space-y-3">
          {/* Negative / Dead */}
          <div className="p-2 rounded-lg" style={{ background: 'rgba(244,63,94,0.03)', border: '1px dashed rgba(244,63,94,0.2)' }}>
            <p className="text-[9px] text-rose font-bold uppercase mb-2 px-1">Negative / Lost</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { val: 'wrong_inquiry', label: 'Wrong No.', icon: <AlertTriangle size={11}/> },
                { val: 'not_interested', label: 'Not Int.', icon: <Frown size={11}/> },
                { val: 'no_whatsapp', label: 'No WA', icon: <MessageSquareX size={11}/> },
              ].map(d => (
                <button
                  key={d.val}
                  onClick={() => handleDisposition(d.val)}
                  className={`disp-btn ${lead.disposition === d.val ? 'active-red' : ''}`}
                >
                  {d.icon} {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Neutral / Retry */}
          <div className="p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.03)', border: '1px dashed rgba(245,158,11,0.2)' }}>
            <p className="text-[9px] text-amber font-bold uppercase mb-2 px-1">Neutral / Retry</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { val: 'busy', label: 'Busy', icon: <Clock size={11}/> },
                { val: 'unreachable', label: 'Unreach.', icon: <PhoneOff size={11}/> },
                { val: 'npc', label: 'NPC', icon: <User size={11}/> },
              ].map(d => (
                <button
                  key={d.val}
                  onClick={() => handleDisposition(d.val)}
                  className={`disp-btn ${lead.disposition === d.val ? 'active-amber' : ''}`}
                >
                  {d.icon} {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Positive */}
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {[
              { val: 'callback', label: 'Callback', icon: <PhoneCall size={11}/> },
              { val: 'has_algo', label: 'Has Algo', icon: <Award size={11}/> },
            ].map(d => (
              <button
                key={d.val}
                onClick={() => handleDisposition(d.val)}
                className={`disp-btn positive ${lead.disposition === d.val ? 'active-green' : ''}`}
              >
                {d.icon} {d.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 4. Lead Profile & Meta */}
      <motion.div variants={itemVariants} className="rounded-xl p-4" style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-ghost flex items-center gap-2">
            <User size={13} /> Lead Profile
          </h4>
          <button
            onClick={() => setIsEditingMeta(!isEditingMeta)}
            className="text-[10px] font-bold text-blue hover:underline"
          >
            {isEditingMeta ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {isEditingMeta ? (
          <div className="space-y-2 animate-in fade-in duration-200">
            <input
              className="input-v2 text-[12px]"
              placeholder="City"
              value={metaForm.city}
              onChange={e => setMetaForm(p => ({ ...p, city: e.target.value }))}
            />
            <input
              className="input-v2 text-[12px]"
              placeholder="Capital (e.g., 5L, 2 lakh)"
              value={metaForm.capital}
              onChange={e => setMetaForm(p => ({ ...p, capital: e.target.value }))}
            />
            <select
              className="input-v2 text-[12px]"
              value={metaForm.broker}
              onChange={e => setMetaForm(p => ({ ...p, broker: e.target.value }))}
            >
              <option value="">Select Broker</option>
              {BROKERS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <select
              className="input-v2 text-[12px]"
              value={metaForm.trading_experience}
              onChange={e => setMetaForm(p => ({ ...p, trading_experience: e.target.value }))}
            >
              <option value="">Trading Experience</option>
              {TRADING_EXPERIENCE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button onClick={saveMeta} className="action-btn primary w-full justify-center">Save Profile</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            {[
              { label: 'City', value: lead.city, icon: MapPin },
              { label: 'Capital', value: lead.capital, icon: IndianRupee },
              { label: 'Broker', value: lead.broker, icon: Building },
              { label: 'Experience', value: lead.trading_experience, icon: Award },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md flex-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-ghost)' }}>
                    <Icon size={12} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-ghost uppercase tracking-wider">{item.label}</p>
                    <p className="text-[12px] text-muted font-medium truncate">{item.value || '—'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
