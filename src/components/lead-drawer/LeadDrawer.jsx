import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MessageCircle, Trash2, ArrowRight } from 'lucide-react';
import useLeadStore from '../../stores/useLeadStore';
import useUIStore from '../../stores/useUIStore';
import useUserStore from '../../stores/useUserStore';
import { classifyLead, TRIAGE_META, getNextBestAction, calculatePriorityScore, getPriorityTag } from '../../engines/aiDecisionEngine';
import { STAGE_LABELS, STAGE_ORDER, NEXT_STAGE, MESSAGE_TEMPLATES } from '../../utils/constants';
import { formatPhoneDisplay } from '../../services/sheetsSync';
import LeadDrawerOverview from './LeadDrawerOverview';
import LeadDrawerActivity from './LeadDrawerActivity';
import LeadDrawerAI from './LeadDrawerAI';
import LeadDrawerNotes from './LeadDrawerNotes';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'ai', label: 'AI' },
  { id: 'notes', label: 'Notes' },
];

export default function LeadDrawer() {
  const { selectedLeadId, isLeadDetailOpen, closeLeadDetail } = useUIStore();
  const { leads, fetchActivitiesForLead, deleteLead, changeStage, activities } = useLeadStore();
  const { getUserById } = useUserStore();
  const lead = leads.find(l => l.id === selectedLeadId);

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (selectedLeadId && isLeadDetailOpen) {
      fetchActivitiesForLead(selectedLeadId);
      setActiveTab('overview');
    }
  }, [selectedLeadId, isLeadDetailOpen]);

  const ai = useMemo(() => {
    if (!lead) return null;
    const triage = classifyLead(lead);
    const priorityScore = calculatePriorityScore(lead);
    return {
      triage,
      triageMeta: TRIAGE_META[triage],
      priorityTag: getPriorityTag(priorityScore),
      priorityScore,
      nba: getNextBestAction(lead),
    };
  }, [lead]);

  const leadActivities = useMemo(() =>
    selectedLeadId ? activities.filter(a => a.lead_id === selectedLeadId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [],
    [activities, selectedLeadId]
  );

  if (!isLeadDetailOpen) return null;

  const phoneClean = lead?.phone?.replace(/[^\d]/g, '');
  const callLink = `tel:+91${phoneClean}`;
  const waTemplate = MESSAGE_TEMPLATES[lead?.status];
  const waLink = waTemplate
    ? `https://wa.me/91${phoneClean}?text=${encodeURIComponent(waTemplate.template(lead?.name || 'there'))}`
    : `https://wa.me/91${phoneClean}`;

  // Stage progress
  const stageIndex = STAGE_ORDER.indexOf(lead?.status);

  return (
    <AnimatePresence>
      {isLeadDetailOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(2, 4, 10, 0.6)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLeadDetail}
          />

          {/* Drawer */}
          <motion.div
            className="fixed inset-y-0 right-0 z-[60] w-full max-w-md flex flex-col shadow-2xl"
            style={{
              background: 'var(--bg-card)',
              borderLeft: '1px solid var(--border-default)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {!lead ? (
              <div className="flex-1 flex-center text-dim">Lead not found</div>
            ) : (
              <>
                {/* Header Block */}
                <div className="p-5 pb-0 border-b border-[var(--border-subtle)] relative overflow-hidden">
                  
                  {/* Subtle Background Glow based on triage */}
                  {ai && (
                    <div
                      className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 pointer-events-none"
                      style={{ background: ai.triageMeta.color, transform: 'translate(20%, -20%)' }}
                    />
                  )}

                  {/* Top row: Name + Close */}
                  <div className="flex items-start justify-between mb-2 relative z-10">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h2 className="text-[22px] font-extrabold text-bright tracking-tight truncate">
                          {lead.name || 'Unknown Lead'}
                        </h2>
                        {ai && (
                          <span className={`triage-badge ${ai.triageMeta.bgClass.replace('triage-', '')}`} style={{ padding: '3px 8px', fontSize: '10px' }}>
                            {ai.triageMeta.icon} {ai.triageMeta.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[13px] text-dim">
                        <span className="mono">{formatPhoneDisplay(lead.phone)}</span>
                        {lead.city && <span>{lead.city}</span>}
                        {lead.capital && <span className="font-bold text-ghost">₹{lead.capital}</span>}
                      </div>
                    </div>
                    
                    <button
                      onClick={closeLeadDetail}
                      className="w-8 h-8 rounded-full flex-center hover:bg-white/[0.08] transition-colors flex-shrink-0 relative z-10"
                    >
                      <X size={18} className="text-ghost" />
                    </button>
                  </div>

                  {/* Stage Tracker */}
                  <div className="mt-4 mb-4 relative z-10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-ghost uppercase tracking-wider">
                        {STAGE_LABELS[lead.status]}
                      </span>
                      {NEXT_STAGE[lead.status] && (
                        <button
                          onClick={() => changeStage(lead.id, NEXT_STAGE[lead.status])}
                          className="text-[10px] text-blue font-bold uppercase tracking-wider flex items-center gap-1 hover:text-bright transition-colors"
                        >
                          Advance <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {STAGE_ORDER.filter(s => s !== 'lost').map((stage, i) => {
                        const isCompleted = i < stageIndex;
                        const isCurrent = i === stageIndex;
                        return (
                          <div
                            key={stage}
                            title={STAGE_LABELS[stage]}
                            className="h-1.5 rounded-full flex-1 transition-all duration-300"
                            style={{
                              background: isCompleted ? 'var(--accent-blue)' : isCurrent ? 'var(--accent-blue)' : 'var(--bg-raised)',
                              opacity: isCurrent ? 1 : isCompleted ? 0.4 : 0.3,
                              boxShadow: isCurrent ? '0 0 8px rgba(59,130,246,0.5)' : 'none'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Sleek Action Bar */}
                  <div className="flex items-center gap-2 mt-5 mb-4 relative z-10">
                    <a
                      href={callLink}
                      className="flex-1 flex-center gap-2 py-2.5 rounded-lg font-bold text-[13px] transition-all"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
                        border: '1px solid rgba(59,130,246,0.3)',
                        color: 'var(--accent-blue)',
                        boxShadow: '0 4px 12px rgba(59,130,246,0.1)'
                      }}
                    >
                      <Phone size={15} /> Call
                    </a>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex-center gap-2 py-2.5 rounded-lg font-bold text-[13px] transition-all hover:brightness-110"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
                        border: '1px solid rgba(16,185,129,0.3)',
                        color: 'var(--accent-emerald)',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.1)'
                      }}
                    >
                      <MessageCircle size={15} /> WhatsApp
                    </a>
                    <button
                      onClick={() => { if (confirm('Delete this lead?')) { deleteLead(lead.id); closeLeadDetail(); } }}
                      className="w-10 flex-center rounded-lg hover:bg-rose/10 transition-colors"
                      style={{ border: '1px solid transparent' }}
                    >
                      <Trash2 size={15} className="text-rose" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex px-2 border-b border-[var(--border-subtle)]" style={{ background: 'var(--bg-card)' }}>
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="flex-1 py-3 text-[12px] font-bold relative transition-colors"
                      style={{
                        color: activeTab === tab.id ? 'var(--text-bright)' : 'var(--text-ghost)',
                      }}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="drawer-tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-5 custom-scroll relative">
                  {/* Subtle Background Pattern */}
                  <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                  }} />

                  <div className="relative z-10">
                    {activeTab === 'overview' && <LeadDrawerOverview lead={lead} ai={ai} />}
                    {activeTab === 'activity' && <LeadDrawerActivity lead={lead} activities={leadActivities} />}
                    {activeTab === 'ai' && <LeadDrawerAI lead={lead} ai={ai} />}
                    {activeTab === 'notes' && <LeadDrawerNotes lead={lead} />}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
