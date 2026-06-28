import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, CreditCard, ChevronRight, Trash2, Phone, MessageCircle, Video, Send, AlertTriangle, Sparkles, AlertCircle, Compass, IndianRupee, MapPin, Building, ShieldAlert, Award, Clock, User, Zap } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUIStore from '../../stores/useUIStore';
import useUserStore from '../../stores/useUserStore';
import CountdownTimer from '../common/CountdownTimer';
import LeadActivityTimeline from '../clients/LeadActivityTimeline';
import { STAGE_LABELS, STAGE_ORDER, STAGE_COLORS, STAGE_CSS, NEXT_STAGE, STAGE_ACTION, MESSAGE_TEMPLATES, PLAN_OPTIONS, BROKERS, TRADING_EXPERIENCE, LOST_REASONS, QUICK_DISPOSITIONS, COMPETITORS, AGE_GROUPS, STAGES, generateGCalLink } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import { calculateHeatScore, getLeadAttentionSignal } from '../../engines/leadIntelligence';
import { parseHinglishFeedback } from '../../engines/hinglishParser';
import { playStageAdvance, playKaChing, playDemoBooked } from '../../utils/sounds';
import { celebrateConversion, celebrateDemoBooked } from '../../utils/celebrations';

export default function LeadDetailPanel() {
  const { selectedLeadId, isLeadDetailOpen, closeLeadDetail, setActivePage, setStageFilter, setCallQueueIndex } = useUIStore();
  const { leads, activities, changeStage, completeFollowUp, rescheduleFollowUp, addNote, addRevenue, deleteLead, fetchActivitiesForLead, updateLead } = useLeadStore();
  const { getUserById } = useUserStore();
  const lead = leads.find(l => l.id === selectedLeadId);

  useEffect(() => {
    if (selectedLeadId && isLeadDetailOpen) fetchActivitiesForLead(selectedLeadId);
  }, [selectedLeadId, isLeadDetailOpen, fetchActivitiesForLead]);

  const acts = useMemo(() =>
    selectedLeadId ? activities.filter(a => a.lead_id === selectedLeadId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [],
    [activities, selectedLeadId]
  );

  const [note, setNote] = useState('');
  const [rev, setRev] = useState('');
  const [fuDate, setFuDate] = useState('');
  const [fuNoteInput, setFuNoteInput] = useState('');
  const [demoDate, setDemoDate] = useState('');
  const [demoLink, setDemoLink] = useState('');
  const [showRev, setShowRev] = useState(false);
  const [showFu, setShowFu] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showLostReason, setShowLostReason] = useState(false);
  const [nextStepText, setNextStepText] = useState(lead?.next_step || '');
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({ city: '', capital: '', broker: '', trading_experience: '', age_group: '', competitor: '' });
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  useEffect(() => {
    if (lead) {
      setNextStepText(lead.next_step || '');
      setFuNoteInput(lead.follow_up_note || '');
      setMetaForm({
        city: lead.city || '', capital: lead.capital || '',
        broker: lead.broker || '', trading_experience: lead.trading_experience || '',
        age_group: lead.age_group || '', competitor: lead.competitor || '',
      });
    }
  }, [lead?.id]);

  const aiDetection = useMemo(() => {
    if (!lead) return null;
    return parseHinglishFeedback(lead.notes || '', lead.follow_up_note || '');
  }, [lead?.notes, lead?.follow_up_note]);

  const ALL_OBJECTIONS = useMemo(() => [
    { key: 'had_losses', label: 'Loss History' },
    { key: 'too_expensive', label: 'Budget Concern' },
    { key: 'no_time', label: 'No Time' },
    { key: 'trust_issues', label: 'Trust / SEBI' },
    { key: 'needs_proof', label: 'Wants Proof' },
  ], []);

  const BATTLECARDS = useMemo(() => ({
    had_losses: { label: 'Loss History Solutions', text: 'We don\'t manage your money — you control everything. Our algo runs on YOUR demat, YOUR rules.', advice: 'Focus on transparency: explain that we do not take pool funds.' },
    too_expensive: { label: 'Pricing & Budget Solutions', text: 'Start with our Starter plan at ₹4,999/mo. Even with 25K capital, option selling strategies can work.', advice: 'Highlight ROI and lower entry cost options.' },
    no_time: { label: 'Time Management Solutions', text: 'That\'s exactly why algo works — it runs 24/7 automatically. Set it once, monitor from your phone.', advice: 'Stress automation: setting up takes just 15 minutes.' },
    trust_issues: { label: 'Trust & Compliance Solutions', text: 'We are SEBI registered. No profit sharing, no account access. Software runs on your own broker.', advice: 'Reassure safety: we are SEBI compliant, no direct funds access.' },
    needs_proof: { label: 'Performance Verification', text: 'We\'ll show you live results in the demo. Also sharing backtested performance reports.', advice: 'Send past PDF backtest reports or invite to screen share.' },
  }), []);

  const SENTIMENTS = useMemo(() => ({
    positive: { label: 'Positive Mood', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', emoji: '🤩' },
    objection: { label: 'Objections Active', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', emoji: '🤔' },
    negative: { label: 'Negative Mood', color: 'text-coral bg-coral/10 border-coral/20', emoji: '😡' },
    neutral: { label: 'Neutral Mood', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', emoji: '😐' },
  }), []);

  const activeObjections = useMemo(() => {
    if (!lead) return [];
    const fromDb = Array.isArray(lead.objections_logged) ? lead.objections_logged : [];
    const fromAi = aiDetection?.objections?.map(o => o.key) || [];
    return Array.from(new Set([...fromDb, ...fromAi]));
  }, [lead?.objections_logged, aiDetection?.objections]);

  const toggleObjection = async (key) => {
    if (!lead) return;
    const current = Array.isArray(lead.objections_logged) ? lead.objections_logged : [];
    let next;
    if (current.includes(key)) {
      next = current.filter(k => k !== key);
    } else {
      next = [...current, key];
    }
    await updateLead(lead.id, { objections_logged: next });
  };

  if (!lead) return null;

  const stageColor = STAGE_COLORS[lead.status] || {};
  const nextStage = NEXT_STAGE[lead.status];
  const waTemplate = MESSAGE_TEMPLATES[lead.status];
  const waLink = `https://wa.me/${lead.phone?.replace(/[^0-9]/g, '')}`;
  const waUrl = waTemplate ? `${waLink}?text=${encodeURIComponent(waTemplate.template(lead.name || 'Trader'))}` : waLink;

  const attention = getLeadAttentionSignal(lead);
  const heatScore = calculateHeatScore(lead);

  const stageAction = STAGE_ACTION[lead.status];

  const saveMetaEdits = async () => {
    await updateLead(lead.id, {
      city: metaForm.city, capital: metaForm.capital,
      broker: metaForm.broker || null, trading_experience: metaForm.trading_experience || null,
      age_group: metaForm.age_group || null, competitor: metaForm.competitor || null,
    });
    setIsEditingMeta(false);
  };

  const handleQuickDisposition = async (disp) => {
    const noteText = `[Disposition: ${disp.label}] Call attempted. Lead marked as ${disp.label}`;
    await addNote(lead.id, noteText);
    await updateLead(lead.id, { disposition: disp.value });
    if (['npc', 'wrong_inquiry', 'not_interested'].includes(disp.value)) {
      await changeStage(lead.id, STAGES.LOST);
    }
    if (disp.value === 'npc' || disp.value === 'busy' || disp.value === 'unreachable') {
      if (!['npc_retry', 'lost'].includes(lead.status)) {
        await changeStage(lead.id, STAGES.NPC_RETRY);
      }
    }
  };

  const handleAdvanceStage = async () => {
    if (!nextStage) return;
    await changeStage(lead.id, nextStage);
    playStageAdvance();
    if (nextStage === STAGES.DEMO_SCHEDULED) {
      playDemoBooked();
      celebrateDemoBooked(lead.name);
    }
  };

  const handleRecordPayment = async () => {
    const plan = PLAN_OPTIONS.find(p => p.value === selectedPlan);
    const amt = selectedPlan === 'custom' ? parseFloat(rev) : plan?.price || parseFloat(rev);
    if (amt > 0) {
      await addRevenue(lead.id, amt);
      await changeStage(lead.id, STAGES.CONVERTED);
      playKaChing();
      celebrateConversion(lead.name, amt);
      setRev('');
      setShowRev(false);
    }
  };

  // Heat color
  const heatColor = heatScore >= 70 ? '#ef4444' : heatScore >= 40 ? '#f59e0b' : '#3b82f6';

  return (
    <AnimatePresence>
      {isLeadDetailOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={closeLeadDetail} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[520px] z-50 bg-void/95 backdrop-blur-2xl border-l border-white/[0.06] shadow-elevated overflow-y-auto font-sans text-tx-dim"
          >
            {/* ── STICKY HEADER ── */}
            <div className="sticky top-0 z-10 bg-void/90 backdrop-blur-xl border-b border-white/[0.04] p-5">
              <div className="flex items-center justify-between mb-4">
                <button onClick={closeLeadDetail} className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] text-tx-ghost hover:text-tx-bright transition">
                  <X size={15} />
                </button>
                <div className="flex items-center gap-3">
                  {/* Heat Score Circular Gauge */}
                  <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/[0.02] border border-white/[0.05]" title={`Heat Score: ${heatScore}`}>
                    <div className="relative w-8 h-8">
                      <svg width="32" height="32" className="transform -rotate-90">
                        <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                        <motion.circle 
                          cx="16" cy="16" r="14" fill="none" stroke={heatColor} strokeWidth="3"
                          strokeDasharray={2 * Math.PI * 14}
                          initial={{ strokeDashoffset: 2 * Math.PI * 14 }}
                          animate={{ strokeDashoffset: (2 * Math.PI * 14) * (1 - heatScore / 100) }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[9px] font-black font-mono" style={{ color: heatColor }}>{heatScore}</span>
                      </div>
                    </div>
                  </div>
                  
                  <span className={`stage-badge ${STAGE_CSS[lead.status]}`}>{STAGE_LABELS[lead.status]}</span>
                  <button
                    onClick={() => {
                      if (confirm('Delete this lead permanently?')) { deleteLead(lead.id); closeLeadDetail(); }
                    }}
                    className="p-2 rounded-xl bg-coral/5 hover:bg-coral/15 border border-coral/10 text-coral/70 hover:text-coral transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Attention Alert */}
              {attention && (
                <div className={`mb-4 px-4 py-2.5 rounded-xl border flex items-center gap-2.5 ${
                  attention.level === 'critical' || attention.level === 'danger'
                    ? 'bg-coral/10 border-coral/25 text-coral' : 'bg-gold/10 border-gold/25 text-gold'
                }`}>
                  <AlertCircle size={14} className="flex-shrink-0 animate-pulse" />
                  <div className="text-[11px] font-bold uppercase tracking-wider flex-1">{attention.label}</div>
                </div>
              )}

              {/* Profile */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-electric bg-electric/10 border border-electric/30 px-2 py-0.5 rounded uppercase tracking-wider">
                    {lead.lead_type === 'web_lead' ? '🌐 Web Lead' : lead.lead_type === 'referral' ? '🤝 Referral' : '📋 Mass Data'}
                  </span>
                  {lead.disposition && (
                    <span className="text-[10px] font-mono text-coral bg-coral/10 border border-coral/20 px-2 py-0.5 rounded uppercase font-bold">
                      {lead.disposition.toUpperCase()}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-extrabold font-heading text-tx-glow tracking-tight mt-2">{lead.name || 'Unknown Client'}</h2>
                <div className="text-sm font-mono text-tx-dim flex items-center gap-1.5 select-all">
                  {(() => {
                    const clean = (lead.phone || '').replace(/[^\d]/g, '');
                    if (clean.length === 10) {
                      return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
                    }
                    return lead.phone || 'No Phone';
                  })()}
                  {lead.city && <span className="text-xs text-tx-ghost flex items-center gap-0.5 font-sans font-normal"><MapPin size={11} /> {lead.city}</span>}
                </div>
                <div className="text-[11px] font-mono text-tx-ghost flex items-center gap-1.5 mt-1.5">
                  <Clock size={11} className="text-electric" />
                  <span>Enquiry Date: <span className="text-tx-bright font-bold">{lead.enquiry_date || lead.created_at ? formatDate(lead.enquiry_date || lead.created_at) : '—'}</span></span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex gap-2 mt-4">
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black hover:bg-emerald-500/15 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] active:scale-95 transition-all">
                  <MessageCircle size={13} /> WhatsApp
                </a>
                {lead.demo_link && (
                  <a href={lead.demo_link} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-500/15 active:scale-95 transition-all">
                    <Video size={13} /> Join Meet
                  </a>
                )}
              </div>

              {/* Redirection Navigation Shortcuts */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setStageFilter(lead.status);
                    closeLeadDetail();
                    setActivePage('pipeline');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-electric/30 text-tx-bright text-[11px] font-bold active:scale-95 transition-all"
                >
                  <Compass size={11} className="text-electric" /> Locate on Board
                </button>
                <button
                  onClick={() => {
                    const followUpQueue = leads.filter(l => !['deployed', 'lost'].includes(l.status) && l.next_follow_up).sort((a, b) => new Date(a.next_follow_up) - new Date(b.next_follow_up));
                    const idx = followUpQueue.findIndex(l => l.id === lead.id);
                    if (idx !== -1) {
                      setCallQueueIndex(idx);
                    } else {
                      setCallQueueIndex(0);
                    }
                    closeLeadDetail();
                    setActivePage('today');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-gold/30 text-tx-bright text-[11px] font-bold active:scale-95 transition-all"
                >
                  <Zap size={11} className="text-gold" /> Guided My Day
                </button>
              </div>
            </div>

            {/* ── SCROLLABLE BODY ── */}
            <div className="p-5 space-y-5">

              {/* META CARDS */}
              <div className="glass-card-flat p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                  <span className="text-[11px] font-bold text-tx-ghost uppercase tracking-wider">Lead Profile</span>
                  <button onClick={() => setIsEditingMeta(!isEditingMeta)} className="text-[10px] font-bold text-electric hover:underline">
                    {isEditingMeta ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {isEditingMeta ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-tx-ghost mb-1">City</label>
                        <input type="text" value={metaForm.city} onChange={e => setMetaForm({ ...metaForm, city: e.target.value })} className="input-field text-xs" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-tx-ghost mb-1">Capital</label>
                        <input type="text" value={metaForm.capital} onChange={e => setMetaForm({ ...metaForm, capital: e.target.value })} className="input-field text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-tx-ghost mb-1">Broker</label>
                        <select value={metaForm.broker} onChange={e => setMetaForm({ ...metaForm, broker: e.target.value })} className="input-field text-xs">
                          <option value="">—</option>
                          {BROKERS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-tx-ghost mb-1">Competitor</label>
                        <select value={metaForm.competitor} onChange={e => setMetaForm({ ...metaForm, competitor: e.target.value })} className="input-field text-xs">
                          <option value="">—</option>
                          {COMPETITORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-tx-ghost mb-1">Experience</label>
                        <select value={metaForm.trading_experience} onChange={e => setMetaForm({ ...metaForm, trading_experience: e.target.value })} className="input-field text-xs">
                          <option value="">—</option>
                          {TRADING_EXPERIENCE.map(te => <option key={te.value} value={te.value}>{te.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-tx-ghost mb-1">Age Group</label>
                        <select value={metaForm.age_group} onChange={e => setMetaForm({ ...metaForm, age_group: e.target.value })} className="input-field text-xs">
                          <option value="">—</option>
                          {AGE_GROUPS.map(ag => <option key={ag.value} value={ag.value}>{ag.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <button onClick={saveMetaEdits} className="btn-primary w-full text-xs py-2">Save Changes</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    {[
                      { icon: <IndianRupee size={13} className="text-mint" />, label: 'Capital', value: lead.capital || '—' },
                      { icon: <MapPin size={13} className="text-electric" />, label: 'City', value: lead.city || '—' },
                      { icon: <Building size={13} className="text-violet" />, label: 'Broker', value: BROKERS.find(b => b.value === lead.broker)?.label || lead.broker || '—' },
                      { icon: <Compass size={13} className="text-gold" />, label: 'Experience', value: TRADING_EXPERIENCE.find(te => te.value === lead.trading_experience)?.label || '—' },
                      { icon: <User size={13} className="text-sky" />, label: 'Age', value: AGE_GROUPS.find(ag => ag.value === lead.age_group)?.label || '—' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.02] border border-white/[0.03] rounded-xl">
                        {item.icon}
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-tx-ghost">{item.label}</div>
                          <div className="font-bold text-tx-bright">{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TRADER PROFILE & INTEL */}
              <div className="glass-card p-4 space-y-4" style={{ borderColor: 'rgba(139,92,246,0.15)', background: 'linear-gradient(to bottom, rgba(139,92,246,0.03), transparent)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-violet">
                    <Sparkles size={13} className="animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Trader Profile & Intel</span>
                  </div>
                  {(() => {
                    const sentimentKey = lead.feedback_sentiment || (activeObjections.length > 0 ? 'objection' : 'neutral');
                    const sentiment = SENTIMENTS[sentimentKey] || SENTIMENTS.neutral;
                    return (
                      <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-bold uppercase flex items-center gap-1 ${sentiment.color}`}>
                        <span>{sentiment.emoji}</span>
                        <span>{sentiment.label}</span>
                      </span>
                    );
                  })()}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
                  <div className="p-2 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                    <span className="text-[9px] text-tx-ghost uppercase font-bold tracking-wider block mb-0.5">Capital Range</span>
                    <span className="text-tx-bright font-semibold">
                      {lead.capital || (aiDetection?.capital?.formatted ? `${aiDetection.capital.formatted} (AI)` : '—')}
                    </span>
                  </div>
                  <div className="p-2 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                    <span className="text-[9px] text-tx-ghost uppercase font-bold tracking-wider block mb-0.5">Broker Used</span>
                    <span className="text-tx-bright font-semibold">
                      {(() => {
                        const val = lead.broker || (aiDetection?.brokers?.length > 0 ? aiDetection.brokers[0] : null);
                        return BROKERS.find(b => b.value === val)?.label || val || '—';
                      })()}
                    </span>
                  </div>
                  <div className="p-2 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                    <span className="text-[9px] text-tx-ghost uppercase font-bold tracking-wider block mb-0.5">Trading Experience</span>
                    <span className="text-tx-bright font-semibold">
                      {(() => {
                        const val = lead.trading_experience || (aiDetection?.experience?.length > 0 ? aiDetection.experience[0].key : null);
                        return TRADING_EXPERIENCE.find(te => te.value === val)?.label || val || '—';
                      })()}
                    </span>
                  </div>
                  <div className="p-2 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                    <span className="text-[9px] text-tx-ghost uppercase font-bold tracking-wider block mb-0.5">Current Competitor</span>
                    <span className="text-tx-bright font-semibold">
                      {(() => {
                        const val = lead.competitor || (aiDetection?.competitors?.length > 0 ? aiDetection.competitors[0].key : null);
                        return COMPETITORS.find(c => c.value === val)?.label || val || '—';
                      })()}
                    </span>
                  </div>
                </div>

                {/* Raw notes block */}
                {lead.notes && (
                  <div className="p-2.5 bg-black/40 border border-white/[0.03] rounded-xl text-xs text-tx-dim italic">
                    "{lead.notes}"
                  </div>
                )}

                {/* Interactive Objection Chips */}
                <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                  <span className="text-[10px] text-tx-ghost uppercase font-bold tracking-wider block">Objections Raised (Interactive)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_OBJECTIONS.map(obj => {
                      const isActive = activeObjections.includes(obj.key);
                      return (
                        <button
                          key={obj.key}
                          type="button"
                          onClick={() => toggleObjection(obj.key)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${
                            isActive
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-black shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                              : 'bg-white/[0.01] text-tx-ghost border-white/[0.05] hover:bg-white/[0.03]'
                          }`}
                        >
                          {isActive ? '✓ ' : ''}{obj.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contextual Battlecards list */}
                <div className="space-y-2 pt-2">
                  <div className="text-[10px] uppercase font-bold text-gold tracking-wider flex items-center gap-1">
                    <ShieldAlert size={11} className="text-amber-400" />
                    <span>Contextual Battlecards</span>
                  </div>
                  
                  <AnimatePresence mode="popLayout">
                    {activeObjections.length > 0 ? (
                      activeObjections.map(key => {
                        const card = BATTLECARDS[key];
                        if (!card) return null;
                        return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            className="bg-amber-500/[0.02] border border-amber-500/20 rounded-xl p-3 space-y-1.5 overflow-hidden"
                          >
                            <div className="text-[11px] font-bold text-amber-400 flex items-center justify-between">
                              <span>🛡️ {card.label}</span>
                              <span className="text-[8px] bg-amber-500/10 text-amber-400/80 px-1.5 py-0.5 rounded uppercase">Script Active</span>
                            </div>
                            <div className="text-[11px] text-tx-bright font-medium leading-relaxed bg-black/30 p-2 rounded-lg border border-white/[0.02]">
                              "{card.text}"
                            </div>
                            <div className="text-[9px] text-tx-ghost italic">
                              💡 Advice: {card.advice}
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="text-[10px] text-tx-ghost italic text-center py-4 bg-white/[0.01] border border-dashed border-white/[0.05] rounded-xl">
                        No objections active. Pitch the benefits of automated execution!
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* NEXT ACTION */}
              <div className="glass-card-flat p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-electric" />
                    <span className="text-[11px] font-bold text-tx-bright uppercase tracking-wider">Next Action</span>
                  </div>
                  {lead.next_follow_up && <CountdownTimer targetDate={lead.next_follow_up} />}
                </div>
                <div className="text-xs font-bold text-tx-bright flex items-center gap-2">
                  🎯 {stageAction?.label || 'Follow up'}
                </div>
                {lead.follow_up_note && (
                  <div className="text-[11px] text-electric italic bg-electric/5 border border-electric/15 rounded-lg px-2.5 py-1.5">📌 "{lead.follow_up_note}"</div>
                )}
              </div>

              {/* QUICK DISPOSITIONS */}
              <div>
                <span className="text-[11px] font-bold text-tx-ghost uppercase tracking-wider block mb-2">Quick Disposition</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {QUICK_DISPOSITIONS.map(disp => (
                    <button key={disp.value} onClick={() => handleQuickDisposition(disp)}
                      className="px-2 py-2 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-electric/20 rounded-lg text-[9px] font-bold text-tx-dim hover:text-electric transition text-center uppercase">
                      {disp.icon} {disp.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* PRIMARY ACTIONS */}
              <div className="grid grid-cols-2 gap-2">
                {nextStage && (
                  <button onClick={handleAdvanceStage}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-electric/10 border border-electric/20 text-electric text-xs font-bold hover:bg-electric/15 transition">
                    <ChevronRight size={14} /> {stageAction?.verb || STAGE_LABELS[nextStage]}
                  </button>
                )}
                <button onClick={() => setShowFu(!showFu)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gold/10 border border-gold/15 text-gold text-xs font-bold hover:bg-gold/15 transition">
                  <Calendar size={14} /> Reschedule
                </button>
                {['discovery', 'first_call', 'npc_retry'].includes(lead.status) && (
                  <button onClick={() => setShowDemo(!showDemo)}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/15 text-blue-400 text-xs font-bold hover:bg-blue-500/15 transition">
                    <Video size={14} /> Schedule Demo
                  </button>
                )}
                {['demo_done', 'negotiation'].includes(lead.status) && (
                  <button onClick={() => setShowRev(!showRev)}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-mint/10 border border-mint/15 text-mint text-xs font-bold hover:bg-mint/15 transition col-span-2">
                    <CreditCard size={14} /> Record Payment & Close
                  </button>
                )}
                {!['converted', 'deployed', 'lost'].includes(lead.status) && (
                  <button onClick={() => setShowLostReason(!showLostReason)}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-coral/8 border border-coral/15 text-coral text-xs font-bold hover:bg-coral/15 transition">
                    <AlertTriangle size={14} /> Lost
                  </button>
                )}
              </div>

              {/* INLINE FORMS */}
              {showFu && (
                <div className="space-y-3 p-4 rounded-xl border border-gold/20 bg-gold/[0.02]">
                  <span className="text-[11px] font-bold text-gold uppercase tracking-wider block">Set Follow-up</span>
                  <input type="text" placeholder="Note (e.g. kal 5-6 bje)" value={fuNoteInput} onChange={e => setFuNoteInput(e.target.value)} className="input-field text-xs" />
                  <input type="text" placeholder="Action (e.g. Discuss Starter plan)" value={nextStepText} onChange={e => setNextStepText(e.target.value)} className="input-field text-xs" />
                  <div className="flex gap-2">
                    <input type="datetime-local" value={fuDate} onChange={e => setFuDate(e.target.value)} className="input-field text-xs flex-1" />
                    <button onClick={() => {
                      if (fuDate && nextStepText.trim()) { rescheduleFollowUp(lead.id, new Date(fuDate).toISOString(), nextStepText.trim(), fuNoteInput.trim() || null); setFuDate(''); setShowFu(false); }
                    }} className="btn-gold text-xs px-4">Schedule</button>
                  </div>
                </div>
              )}

              {showDemo && (
                <div className="space-y-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.02]">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">Schedule Google Meet Demo</span>
                  <input type="datetime-local" value={demoDate} onChange={e => setDemoDate(e.target.value)} className="input-field text-xs" />
                  <input type="url" value={demoLink} onChange={e => setDemoLink(e.target.value)} placeholder="Google Meet URL" className="input-field text-xs" />
                  {demoDate && (
                    <a href={generateGCalLink({ title: `Algo Trading Demo — ${lead.name || lead.phone}`, description: `Live demo for ${lead.name}. Capital: ${lead.capital || 'N/A'}`, startDate: demoDate })}
                      target="_blank" rel="noopener noreferrer" className="block text-[11px] text-blue-400 hover:underline">📅 Add to Google Calendar →</a>
                  )}
                  <button onClick={async () => {
                    if (demoDate) {
                      await updateLead(lead.id, { demo_date: new Date(demoDate).toISOString(), demo_link: demoLink || null });
                      await changeStage(lead.id, STAGES.DEMO_SCHEDULED);
                      playDemoBooked();
                      celebrateDemoBooked(lead.name);
                      setDemoDate(''); setDemoLink(''); setShowDemo(false);
                    }
                  }} className="btn-primary w-full text-xs">Schedule Live Demo</button>
                </div>
              )}

              {showRev && (
                <div className="space-y-3 p-4 rounded-xl border border-mint/20 bg-mint/[0.02]">
                  <span className="text-[11px] font-bold text-mint uppercase tracking-wider block">Record Payment</span>
                  <div className="grid grid-cols-2 gap-2">
                    {PLAN_OPTIONS.map(plan => (
                      <button key={plan.value}
                        onClick={() => { setSelectedPlan(plan.value); if (plan.price > 0) setRev(String(plan.price)); }}
                        className={`p-2.5 rounded-xl text-xs text-left transition ${selectedPlan === plan.value ? 'bg-mint/10 border border-mint/25 text-mint' : 'bg-white/[0.02] border border-white/[0.05] text-tx-dim hover:bg-white/[0.04]'}`}>
                        <div className="font-bold">{plan.label}</div>
                        <div className="text-[10px] mt-0.5">{plan.desc}</div>
                        {plan.badge && <span className="text-[8px] font-bold text-gold mt-1 inline-block">{plan.badge}</span>}
                      </button>
                    ))}
                  </div>
                  {selectedPlan === 'custom' && (
                    <input type="number" placeholder="₹ Custom Amount" value={rev} onChange={e => setRev(e.target.value)} className="input-field text-xs" />
                  )}
                  <button onClick={handleRecordPayment} className="btn-success w-full text-xs py-3">
                    💰 Collect ₹{(selectedPlan === 'custom' ? rev : PLAN_OPTIONS.find(p => p.value === selectedPlan)?.price || 0).toLocaleString('en-IN')}
                  </button>
                </div>
              )}

              {showLostReason && (
                <div className="space-y-3 p-4 rounded-xl border border-coral/25 bg-coral/[0.02]">
                  <span className="text-[11px] font-bold text-coral uppercase tracking-wider block">Lost Reason</span>
                  <select className="input-field text-xs" onChange={async (e) => {
                    if (e.target.value) {
                      await changeStage(lead.id, STAGES.LOST);
                      await addNote(lead.id, `Lead marked lost. Reason: ${e.target.value}`);
                      setShowLostReason(false);
                    }
                  }}>
                    <option value="">Choose reason...</option>
                    {LOST_REASONS.map(r => <option key={r.value} value={r.label}>{r.label}</option>)}
                  </select>
                </div>
              )}

              {/* REVENUE */}
              {lead.revenue > 0 && (
                <div className="bg-gradient-to-r from-mint/10 to-neon/10 border border-mint/20 rounded-2xl p-4">
                  <span className="text-[10px] text-mint uppercase tracking-wider font-bold block">Total Revenue</span>
                  <div className="text-2xl font-extrabold text-mint mt-1 font-heading">₹{Number(lead.revenue).toLocaleString('en-IN')}</div>
                </div>
              )}

              {/* NOTES */}
              <div>
                <span className="text-[11px] font-bold text-tx-bright uppercase tracking-wider block mb-2">Notes</span>
                <div className="flex gap-2">
                  <input type="text" placeholder="Type note & press Enter..." value={note} onChange={e => setNote(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && note.trim()) { addNote(lead.id, note.trim()); setNote(''); } }}
                    className="input-field text-xs flex-1" />
                  <button onClick={() => { if (note.trim()) { addNote(lead.id, note.trim()); setNote(''); } }}
                    className="btn-ghost px-3"><Send size={13} /></button>
                </div>
              </div>

              {/* STAGE CONTROL */}
              <div>
                <span className="text-[11px] font-bold text-tx-ghost uppercase tracking-wider block mb-2.5">Pipeline Stage</span>
                <div className="flex flex-wrap gap-1.5">
                  {STAGE_ORDER.map(s => {
                    const isActive = lead.status === s;
                    return (
                      <button key={s} onClick={() => changeStage(lead.id, s)}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition ${
                          isActive ? `stage-badge ${STAGE_CSS[s]}` : 'bg-white/[0.02] border-white/[0.05] text-tx-ghost hover:bg-white/[0.04]'
                        }`}>
                        {STAGE_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RE-ASSIGNMENT */}
              {['manager', 'admin'].includes(useUserStore.getState().getCurrentUser()?.role) && (
                <div>
                  <span className="text-[11px] font-bold text-tx-ghost uppercase tracking-wider block mb-2">Re-assign</span>
                  <select className="input-field text-xs" value={lead.assigned_to || ''} onChange={async (e) => { await updateLead(lead.id, { assigned_to: e.target.value }); }}>
                    <option value="">Select Rep</option>
                    {useUserStore.getState().users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}

              {/* TIMELINE */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-white/[0.03] pb-2">
                  <span className="text-[11px] font-bold text-tx-bright uppercase tracking-wider">Timeline</span>
                  <span className="text-[9px] font-mono text-tx-ghost">{acts.length} events</span>
                </div>
                <LeadActivityTimeline activities={acts} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
