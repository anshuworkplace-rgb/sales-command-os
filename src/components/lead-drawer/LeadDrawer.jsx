import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MessageCircle, Calendar, Trash2 } from 'lucide-react';
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
            className="lead-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLeadDetail}
          />

          {/* Drawer */}
          <motion.div
            className="lead-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {!lead ? (
              <div className="flex-1 flex-center text-dim">Lead not found</div>
            ) : (
              <>
                {/* Header */}
                <div className="drawer-header">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-[20px] font-extrabold text-bright tracking-tight truncate">
                          {lead.name || 'Unknown Lead'}
                        </h2>
                        {ai && (
                          <span className={`triage-badge ${ai.triageMeta.bgClass.replace('triage-', '')}`}>
                            {ai.triageMeta.icon} {ai.triageMeta.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-dim">
                        <span className="mono">{formatPhoneDisplay(lead.phone)}</span>
                        {lead.city && <span>{lead.city}</span>}
                        {lead.capital && <span className="font-semibold">₹{lead.capital}</span>}
                      </div>
                    </div>
                    <button
                      onClick={closeLeadDetail}
                      className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                    >
                      <X size={18} className="text-ghost" />
                    </button>
                  </div>

                  {/* Stage Progress Bar */}
                  <div className="stage-progress mt-3">
                    {STAGE_ORDER.filter(s => s !== 'lost').map((stage, i) => (
                      <div
                        key={stage}
                        className={`stage-dot ${i < stageIndex ? 'completed' : i === stageIndex ? 'current' : ''}`}
                        title={STAGE_LABELS[stage]}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-ghost uppercase tracking-wider">
                      {STAGE_LABELS[lead.status]}
                    </span>
                    {NEXT_STAGE[lead.status] && (
                      <button
                        onClick={() => changeStage(lead.id, NEXT_STAGE[lead.status])}
                        className="text-[10px] text-blue font-bold uppercase tracking-wider hover:underline"
                      >
                        Advance → {STAGE_LABELS[NEXT_STAGE[lead.status]]}
                      </button>
                    )}
                  </div>

                  {/* Quick Actions Row */}
                  <div className="flex items-center gap-2 mt-3">
                    <a href={callLink} className="action-btn primary flex-1 justify-center">
                      <Phone size={14} /> Call
                    </a>
                    <a href={waLink} target="_blank" rel="noreferrer" className="action-btn success flex-1 justify-center">
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                    <button
                      onClick={() => { if (confirm('Delete this lead?')) { deleteLead(lead.id); closeLeadDetail(); } }}
                      className="action-btn danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="drawer-tabs">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`drawer-tab ${activeTab === tab.id ? 'active' : ''}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="drawer-body">
                  {activeTab === 'overview' && <LeadDrawerOverview lead={lead} ai={ai} />}
                  {activeTab === 'activity' && <LeadDrawerActivity lead={lead} activities={leadActivities} />}
                  {activeTab === 'ai' && <LeadDrawerAI lead={lead} ai={ai} />}
                  {activeTab === 'notes' && <LeadDrawerNotes lead={lead} />}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
