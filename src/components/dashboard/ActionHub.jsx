import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import useUIStore from '../../stores/useUIStore';
import { evaluateLeadPriority } from '../../engines/salesIntelligence';
import { Zap, MapPin, Sparkles, Clock, AlertTriangle, Phone, MessageCircle, CheckCircle2 } from 'lucide-react';
import { formatRelative } from '../../utils/dateUtils';

// Simple countdown timer for SLA visualization
const SLACountdown = ({ score }) => {
  const [timeLeft, setTimeLeft] = useState(100 - score); // Mock mapping for visual urgency

  useEffect(() => {
    if (score < 80) return; // Only count down for high score
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 60000); // Deplete every minute
    return () => clearInterval(timer);
  }, [score]);

  if (score < 80) return null;

  return (
    <div className="flex flex-col gap-1 w-full mt-2">
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-coral">
        <span>SLA Warning</span>
        <span>{Math.floor(timeLeft / 60)}h {timeLeft % 60}m remaining</span>
      </div>
      <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: '100%' }}
          animate={{ width: `${(timeLeft / 100) * 100}%` }}
          className="h-full bg-gradient-to-r from-coral to-red-600"
          transition={{ duration: 1 }}
        />
      </div>
    </div>
  );
};

const ActionHub = () => {
  const { leads, loading } = useLeadStore();
  const { getCurrentUser } = useUserStore();
  const { openLeadDetail, toggleCommandPalette, focusedLeadId } = useUIStore();
  const currentUser = getCurrentUser();

  const { prioritizedLeads, summaryStats } = useMemo(() => {
    if (!leads || !currentUser) return { prioritizedLeads: [], summaryStats: {} };

    const myLeads = leads.filter(l => l.assigned_to === currentUser.id && !['closed_won', 'lost', 'deployed', 'converted'].includes(l.status));
    
    const evaluatedLeads = myLeads.map(lead => {
      const evaluation = evaluateLeadPriority(lead);
      return { ...lead, ai: evaluation };
    });

    // Sort by AI score (highest first)
    const sorted = evaluatedLeads.sort((a, b) => b.ai.score - a.ai.score);
    
    const stats = {
      critical: sorted.filter(l => l.ai.tag === 'CRITICAL').length,
      urgent: sorted.filter(l => l.ai.tag === 'URGENT').length,
      high: sorted.filter(l => l.ai.tag === 'HIGH').length,
    };

    return { prioritizedLeads: sorted, summaryStats: stats };
  }, [leads, currentUser]);

  const handleLeadClick = (lead) => {
    openLeadDetail(lead.id);
  };

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
  const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  if (loading) return <div className="p-8 text-tx-dim font-mono text-center animate-pulse">Initializing Action HUB...</div>;

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet to-electric flex items-center justify-center shadow-glow-violet">
          <Zap size={20} className="text-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold font-heading text-tx-glow tracking-tight">Action HUB</h1>
          <p className="text-sm font-medium text-tx-dim flex items-center gap-1.5 mt-0.5">
            <Sparkles size={13} className="text-electric" />
            AI-Prioritized Command Center
          </p>
        </div>
      </motion.div>

      {/* AI Guidance Box */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-6 border-l-4 border-l-electric bg-gradient-to-r from-electric/10 to-transparent relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Zap size={100} />
        </div>
        <h2 className="text-lg font-bold text-tx-bright mb-2 flex items-center gap-2">
          <Sparkles size={16} className="text-electric" /> Today's Directives
        </h2>
        <div className="flex flex-wrap gap-4 mt-4 relative z-10">
          <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 flex flex-col">
            <span className="text-xxs font-bold text-coral uppercase tracking-widest mb-0.5">Critical</span>
            <span className="text-xl font-black text-tx-glow">{summaryStats.critical} Leads</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 flex flex-col">
            <span className="text-xxs font-bold text-amber uppercase tracking-widest mb-0.5">Urgent Follow-ups</span>
            <span className="text-xl font-black text-tx-glow">{summaryStats.urgent} Leads</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 flex flex-col">
            <span className="text-xxs font-bold text-electric uppercase tracking-widest mb-0.5">High Priority</span>
            <span className="text-xl font-black text-tx-glow">{summaryStats.high} Leads</span>
          </div>
        </div>
        <p className="text-sm text-tx-primary mt-4 font-medium max-w-2xl leading-relaxed relative z-10">
          The AI has analyzed your pipeline and sorted all active leads based on enquiry date, feedback, and SLA logic. Focus on the stream below from top to bottom.
        </p>
      </motion.div>

      {/* Urgency Stream */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-tx-dim uppercase tracking-widest flex items-center gap-2">
            <Zap size={14} className="text-gold" /> Priority Stream
          </h3>
          <button onClick={toggleCommandPalette} className="text-[10px] uppercase font-bold text-electric hover:text-tx-bright transition flex items-center gap-1 bg-electric/10 px-2 py-1 rounded">
            Use Command Palette (⌘K)
          </button>
        </div>
        
        {prioritizedLeads.length === 0 ? (
          <div className="text-center p-10 glass-card">
            <CheckCircle2 size={40} className="text-mint mx-auto mb-3" />
            <p className="text-tx-primary font-bold">Inbox Zero!</p>
            <p className="text-tx-dim text-sm mt-1">You have handled all immediate priorities.</p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-3">
            {prioritizedLeads.map(lead => (
              <motion.div 
                variants={fadeUp}
                key={lead.id} 
                data-keyboard-nav="lead"
                data-lead-id={lead.id}
                onClick={() => handleLeadClick(lead)}
                className={`lead-card group grid grid-cols-1 md:grid-cols-12 gap-4 items-center !p-4 cursor-pointer relative overflow-hidden transition-all duration-300 hover:scale-[1.01]
                  ${lead.ai.tag === 'CRITICAL' ? '!border-coral/40 shadow-[0_0_20px_rgba(244,63,94,0.15)] bg-coral/5' : ''}
                  ${lead.ai.tag === 'URGENT' ? '!border-amber/40 shadow-[0_0_20px_rgba(245,158,11,0.1)] bg-amber/5' : ''}
                  ${lead.ai.tag === 'HIGH' ? '!border-electric/40 shadow-[0_0_20px_rgba(59,130,246,0.1)] bg-electric/5' : ''}
                  ${focusedLeadId === lead.id ? 'ring-2 ring-electric/50 bg-white/[0.04]' : ''}
                `}
              >
                {/* Score & Name Block */}
                <div className="col-span-1 md:col-span-4 flex items-center gap-4 relative z-10">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition flex-shrink-0 shadow-inner">
                    <span className="text-[10px] font-bold text-tx-dim uppercase tracking-wider mb-[-2px]">Score</span>
                    <span className={`text-lg font-black font-mono leading-none
                      ${lead.ai.score >= 90 ? 'text-coral' : lead.ai.score >= 70 ? 'text-electric' : 'text-tx-primary'}
                    `}>{lead.ai.score}</span>
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-base font-extrabold text-tx-glow truncate group-hover:text-electric transition-colors" title={lead.name}>
                      {lead.name || 'Unknown Client'}
                    </h4>
                    <span className="text-xs font-semibold text-tx-dim font-mono mt-0.5 inline-block truncate w-full" title={lead.phone}>
                      {lead.phone}
                    </span>
                  </div>
                </div>

                {/* AI Guidance Block */}
                <div className="col-span-1 md:col-span-5 bg-black/30 rounded-lg p-3 border border-white/5 relative z-10 group-hover:border-electric/30 transition-colors">
                  <div className="flex items-start gap-2">
                    <Sparkles size={14} className="text-violet mt-0.5 flex-shrink-0 animate-pulse" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-tx-bright">{lead.ai.action}</p>
                      <p className="text-[11px] text-tx-dim mt-0.5 line-clamp-1" title={lead.feedback || lead.status}>
                        {lead.feedback ? `Feedback: ${lead.feedback}` : `Status: ${lead.status.replace('_', ' ')}`}
                      </p>
                      <SLACountdown score={lead.ai.score} />
                    </div>
                  </div>
                </div>

                {/* Meta Block & Quick Actions */}
                <div className="col-span-1 md:col-span-3 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md
                      ${lead.ai.tag === 'CRITICAL' ? 'bg-coral/20 text-coral border border-coral/30' : ''}
                      ${lead.ai.tag === 'URGENT' ? 'bg-amber/20 text-amber border border-amber/30' : ''}
                      ${lead.ai.tag === 'HIGH' ? 'bg-electric/20 text-electric border border-electric/30' : ''}
                      ${['CRITICAL', 'URGENT', 'HIGH'].includes(lead.ai.tag) ? '' : 'bg-white/10 text-tx-dim'}
                    `}>
                      {lead.ai.tag}
                    </span>
                  </div>
                  
                  {/* Default View (Time) */}
                  <div className="md:group-hover:hidden flex items-center transition-all">
                    {lead.enquiryDate && (
                      <span className="text-[10px] font-medium text-tx-ghost flex items-center gap-1">
                        <Clock size={10} /> Enq: {formatRelative(lead.enquiryDate)}
                      </span>
                    )}
                  </div>

                  {/* Hover Quick Actions */}
                  <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-0">
                    <button className="p-1.5 bg-electric/20 text-electric rounded-lg hover:bg-electric hover:text-white transition shadow-glow-electric" title="Call">
                      <Phone size={14} />
                    </button>
                    <button className="p-1.5 bg-mint/20 text-mint rounded-lg hover:bg-mint hover:text-white transition shadow-glow-mint" title="Message">
                      <MessageCircle size={14} />
                    </button>
                  </div>
                </div>

                {/* Animated progress bar overlay for very high score items */}
                {lead.ai.score >= 90 && (
                  <motion.div 
                    initial={{ scaleX: 0 }} 
                    animate={{ scaleX: 1 }} 
                    transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
                    className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-coral to-transparent w-full origin-left opacity-50 pointer-events-none" 
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ActionHub;
