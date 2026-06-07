import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, AlertTriangle, Clock, Flame, Phone, TrendingDown,
  Zap, Star, RefreshCw, MessageCircle, Info, Filter,
  ArrowRight, Key, ShieldCheck, Copy, Check, Users, Target, BarChart3, TrendingUp
} from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import useLeadStore from '../../stores/useLeadStore';
import useUIStore from '../../stores/useUIStore';
import useUserStore from '../../stores/useUserStore';
import useToastStore from '../../stores/useToastStore';
import { getInsights } from '../../engines/intelligence';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } }
};

export default function AIIntelligence() {
  const { leads, activities, fetchAllActivities, completeFollowUp } = useLeadStore();
  const { openLeadDetail } = useUIStore();
  const { users, monthlyTargets, fetchAllProfiles } = useUserStore();
  const { addToast } = useToastStore();

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('salesos_gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Load backend data on mount
  useEffect(() => {
    fetchAllActivities();
    fetchAllProfiles();
  }, [fetchAllActivities, fetchAllProfiles]);

  // Compute insights
  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await getInsights({
        leads,
        activities,
        users,
        targets: monthlyTargets,
        apiKey: apiKey.trim() || null
      });
      setInsights(result);
    } catch (err) {
      console.error('Error running intelligence engine:', err);
      addToast({
        title: 'Analysis failed',
        message: 'There was an error compiling AI recommendations.',
        type: 'danger'
      });
    } finally {
      setLoading(false);
    }
  };

  // Re-run analysis if leads/activities change or key changes
  useEffect(() => {
    if (leads.length > 0) {
      runAnalysis();
    }
  }, [leads, activities, users, monthlyTargets]);

  // Handle saving API key
  const saveApiKey = (keyVal) => {
    setApiKey(keyVal);
    localStorage.setItem('salesos_gemini_api_key', keyVal);
    addToast({
      title: 'API Settings Saved',
      message: keyVal ? 'Gemini API key is configured. Refreshing analysis...' : 'Using local fallback engine.',
      type: 'success'
    });
    // Trigger run with new key
    setTimeout(() => {
      runAnalysis();
    }, 100);
  };

  // Helper for copy to clipboard
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast({
      title: 'Coaching Prompt Copied',
      message: 'Paste it in Slack or your calendar agenda.',
      type: 'info'
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Selectable leads for Smart Router
  const routerLeads = useMemo(() => {
    return leads
      .filter(l => !['converted', 'deployed', 'lost'].includes(l.status))
      .slice(0, 10);
  }, [leads]);

  // Set default selected lead for router simulator
  useEffect(() => {
    if (routerLeads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(routerLeads[0].id);
    }
  }, [routerLeads, selectedLeadId]);

  // Compute smart routing for selected lead
  const routingSimulation = useMemo(() => {
    if (!selectedLeadId || !insights?.smartRouting) return null;
    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) return null;

    // Hot hand recommendation
    const recommendedRep = users.find(u => u.id === insights.smartRouting.recommendedRepId);
    
    // Fallback/Compare with other reps
    const comparisons = users
      .filter(u => u.role === 'sales')
      .map(rep => {
        const repLeads = leads.filter(l => l.assigned_to === rep.id);
        const repWon = repLeads.filter(l => l.status === 'converted');
        const repTotal = repWon.length + repLeads.filter(l => l.status === 'lost').length;
        const repWinRate = repTotal > 0 ? Math.round((repWon.length / repTotal) * 100) : 18;
        
        // Win rate for this source specifically
        const sourceLeads = repLeads.filter(l => l.source === lead.source);
        const sourceWon = sourceLeads.filter(l => l.status === 'converted');
        const sourceTotal = sourceWon.length + sourceLeads.filter(l => l.status === 'lost').length;
        const sourceWinRate = sourceTotal > 0 ? Math.round((sourceWon.length / sourceTotal) * 100) : repWinRate;

        return {
          repName: rep.name,
          winRate: repWinRate,
          sourceWinRate,
          isBest: rep.id === insights.smartRouting.recommendedRepId
        };
      });

    return {
      leadName: lead.name || lead.phone,
      leadSource: lead.source || 'manual',
      recommendedRepName: recommendedRep?.name || insights.smartRouting.recommendedRepName || 'Unassigned',
      rationale: insights.smartRouting.rationale,
      comparisons
    };
  }, [selectedLeadId, insights, leads, users]);

  // Loading skeleton state wrapper
  const renderBentoSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
      {/* Left Column Skeleton */}
      <div className="lg:col-span-6 space-y-5">
        <div className="app-card !p-6 h-[480px] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="skeleton h-6 w-1/3" />
            <div className="skeleton h-4 w-1/2" />
            <div className="space-y-3 mt-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="flex gap-4 items-center">
                  <div className="skeleton h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-1/4" />
                    <div className="skeleton h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="app-card !p-6 h-[250px]">
          <div className="skeleton h-6 w-1/3 mb-4" />
          <div className="skeleton h-4 w-2/3 mb-6" />
          <div className="skeleton h-20 w-full" />
        </div>
      </div>
      {/* Right Column Skeleton */}
      <div className="lg:col-span-4 space-y-5">
        <div className="app-card !p-6 h-[240px]">
          <div className="skeleton h-6 w-1/3 mb-4" />
          <div className="skeleton h-12 w-full mb-4" />
          <div className="skeleton h-20 w-full" />
        </div>
        <div className="app-card !p-6 h-[240px]">
          <div className="skeleton h-6 w-1/3 mb-4" />
          <div className="skeleton h-12 w-full mb-4" />
          <div className="skeleton h-20 w-full" />
        </div>
        <div className="app-card !p-6 h-[230px]">
          <div className="skeleton h-6 w-1/3 mb-4" />
          <div className="skeleton h-12 w-full" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.15)]">
              <Brain className="text-violet animate-pulse" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black font-heading text-tx-glow flex items-center gap-2">
                Intelligence Hub <span className="text-[10px] px-2 py-0.5 rounded bg-violet/15 text-violet border border-violet/30 font-mono font-bold tracking-widest">v2.0</span>
              </h1>
              <p className="text-xs text-tx-dim mt-0.5">Predictive forecasting, Next Best Action priority pipeline, and smart lead routing controls.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* API Config dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                apiKey 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-white/[0.02] border-white/[0.08] text-tx-primary hover:bg-white/[0.05]'
              }`}
            >
              {apiKey ? <ShieldCheck size={14} /> : <Key size={14} />}
              {apiKey ? 'API Connected' : 'Connect Gemini'}
            </button>

            <AnimatePresence>
              {showKeyInput && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 mt-2 w-72 p-4 rounded-xl bg-[#0c0f1a] border border-white/[0.08] shadow-2xl z-50 space-y-3"
                >
                  <h4 className="text-xs font-bold text-tx-bright uppercase tracking-wider">Gemini API Key</h4>
                  <p className="text-[10px] text-tx-dim leading-relaxed">Required to enable Claude/Gemini insights. Without it, SalesOS runs the localized fallback engine.</p>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-void border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-tx-bright outline-none focus:border-violet transition"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        saveApiKey('');
                        setShowKeyInput(false);
                      }}
                      className="px-2 py-1 text-[10px] font-bold text-coral bg-coral/15 rounded hover:bg-coral/25"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => {
                        saveApiKey(apiKey);
                        setShowKeyInput(false);
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold text-white bg-violet rounded hover:bg-violet/85"
                    >
                      Save Key
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet to-purple-700 text-white rounded-lg hover:from-violet/90 hover:to-purple-700/95 font-bold text-xs shadow-lg hover:shadow-violet/20 transition active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Recalculate Audit
          </button>
        </div>
      </div>

      {loading || !insights ? (
        renderBentoSkeleton()
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-10 gap-5"
        >
          {/* Left Column: Actions & Coaching */}
          <div className="lg:col-span-6 space-y-5 flex flex-col justify-between">
            {/* NEXT BEST ACTION FEED */}
            <motion.div variants={fadeUp} className="app-card !p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black text-tx-bright uppercase tracking-wider flex items-center gap-2">
                    <Zap className="text-electric" size={16} /> Next Best Action Feed
                  </h3>
                  <p className="text-[11px] text-tx-dim mt-0.5">Ranked recommendations by (Value × Win Probability × Urgency × SLA Risk).</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-electric/15 text-electric border border-electric/30 font-bold font-mono">
                  {insights.nextBestActions.length} Actions
                </span>
              </div>

              {insights.nextBestActions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/[0.01] rounded-xl border border-dashed border-white/[0.04]">
                  <ShieldCheck size={36} className="text-mint opacity-40 mb-3" />
                  <p className="text-xs text-tx-bright font-bold">Inbox Zero!</p>
                  <p className="text-[11px] text-tx-dim mt-1">No critical tasks or SLA warnings currently active.</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1.5 no-scrollbar flex-1">
                  {insights.nextBestActions.map((action, idx) => {
                    const lead = leads.find(l => l.id === action.leadId);
                    const explainInfo = insights.leadScores?.[action.leadId];
                    const val = lead ? Math.max(Number(lead.revenue || 0), parseFloat(String(lead.capital || '').replace(/[^\d]/g, '')) || 0, 25000) : 25000;
                    
                    return (
                      <div
                        key={action.leadId}
                        data-keyboard-nav="lead"
                        data-lead-id={action.leadId}
                        onClick={() => openLeadDetail(action.leadId)}
                        className={`group border rounded-xl p-4 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.12] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer relative overflow-hidden ${
                          action.score >= 85 
                            ? 'border-coral/20 hover:border-coral/40 shadow-[0_0_15px_rgba(239,68,68,0.03)]' 
                            : 'border-white/[0.05]'
                        }`}
                      >
                        {/* Glow indicator */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                          action.score >= 85 ? 'bg-coral' : action.score >= 60 ? 'bg-amber' : 'bg-electric'
                        }`} />

                        <div className="flex items-start gap-4">
                          {/* Score circle */}
                          <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border select-none ${
                            action.score >= 85 
                              ? 'bg-coral/5 border-coral/30 text-coral' 
                              : action.score >= 60 
                                ? 'bg-amber/5 border-amber/30 text-amber' 
                                : 'bg-electric/5 border-electric/30 text-electric'
                          }`}>
                            <span className="text-[9px] uppercase tracking-tighter leading-none opacity-60">Score</span>
                            <span className="text-[13px] font-black font-heading mt-[-2px]">{action.score}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black text-tx-bright group-hover:text-white transition">
                                {action.leadName}
                              </span>
                              {lead?.source && (
                                <span className="text-[9px] px-2 py-0.2 rounded bg-white/[0.04] text-tx-dim border border-white/[0.06] font-mono font-semibold uppercase">
                                  {lead.source}
                                </span>
                              )}
                              <span className="text-[10px] text-mint font-bold">
                                ₹{val.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="text-[11px] font-extrabold text-tx-primary flex items-center gap-1.5">
                              <ArrowRight size={10} className="text-tx-dim" />
                              {action.action}
                            </div>
                            <p className="text-[10.5px] text-tx-dim leading-relaxed italic">
                              "{action.why}"
                            </p>

                            {/* Inline Explainable Factors */}
                            {explainInfo && (
                              <div className="flex flex-wrap gap-1.5 pt-1.5">
                                {explainInfo.reasons.map((res, ridx) => (
                                  <span key={ridx} className="text-[9px] px-2 py-0.5 rounded bg-white/[0.03] text-tx-dim border border-white/[0.04] flex items-center gap-1 font-bold">
                                    <Info size={8} /> {res}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Direct action triggers */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {lead?.phone && (
                            <a
                              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(lead.name || '')},%20this%20is%20SalesOS.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider transition"
                            >
                              <MessageCircle size={12} /> WhatsApp
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              completeFollowUp(action.leadId);
                              addToast({
                                title: 'Task Completed',
                                message: `Rescheduled follow-up to tomorrow for ${action.leadName}.`,
                                type: 'success'
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-tx-bright border border-white/[0.08] text-[10px] font-black uppercase tracking-wider transition"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* MANAGER COACHING CORNER */}
            <motion.div variants={fadeUp} className="app-card !p-6">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black text-tx-bright uppercase tracking-wider flex items-center gap-2">
                    <Users className="text-violet" size={16} /> Manager Coaching Corner
                  </h3>
                  <p className="text-[11px] text-tx-dim mt-0.5">Automated detection of performance anomalies with ready-to-use manager coaching prompts.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.managerCoaching.map((coach, cidx) => {
                  const uniqueId = `coaching-${coach.repId}-${cidx}`;
                  const isCopied = copiedId === uniqueId;
                  const copyText = `[SalesOS coaching blueprint for ${coach.repName}]
- Anomaly: ${coach.anomaly}
- Recommended Prompt: ${coach.prompt}
- Suggested Fix: ${coach.fix}`;

                  return (
                    <div
                      key={uniqueId}
                      className="border border-white/[0.05] rounded-xl p-4 bg-white/[0.01] hover:bg-white/[0.02] flex flex-col justify-between gap-3 relative"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-violet bg-violet/10 border border-violet/25 px-2 py-0.5 rounded uppercase font-mono">
                            {coach.repName}
                          </span>
                          <span className="text-[9px] text-coral font-bold flex items-center gap-1">
                            <AlertTriangle size={10} /> Anomaly
                          </span>
                        </div>
                        <h4 className="text-[11.5px] font-extrabold text-tx-bright">{coach.anomaly}</h4>
                        <div className="space-y-1 text-[11px] leading-relaxed">
                          <p className="text-tx-primary"><strong className="text-tx-dim">Coaching Action:</strong> "{coach.prompt}"</p>
                          <p className="text-mint"><strong className="text-tx-dim">Suggested Fix:</strong> {coach.fix}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => copyToClipboard(copyText, uniqueId)}
                        className={`w-full py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                          isCopied 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-white/[0.03] border-white/[0.08] text-tx-bright hover:bg-white/[0.08]'
                        }`}
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        {isCopied ? 'Copied Details' : 'Copy Action Plan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Physics, Forecasts & Smart Router */}
          <div className="lg:col-span-4 space-y-5">
            {/* PIPELINE PHYSICS MATRIX */}
            <motion.div variants={fadeUp} className="app-card !p-6 flex flex-col h-[280px] justify-between">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-2">
                <h3 className="text-xs font-black text-tx-bright uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="text-neon" size={14} /> Pipeline Physics Matrix
                </h3>
                <span className="text-[8px] font-extrabold bg-white/[0.04] text-tx-dim border border-white/[0.08] px-1.5 py-0.5 rounded font-mono">
                  30D PERIODS
                </span>
              </div>

              {/* Dials row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 space-y-1 relative">
                  <span className="text-[9px] uppercase tracking-wider text-tx-dim font-bold">Pipeline Velocity</span>
                  <div className="text-[17px] font-black text-tx-bright">
                    ₹{formatCompact(insights.pipelinePhysics.velocity)}/d
                  </div>
                  <div className={`text-[9.5px] font-extrabold flex items-center gap-1 ${
                    insights.pipelinePhysics.velocityDelta >= 0 ? 'text-mint' : 'text-coral'
                  }`}>
                    {insights.pipelinePhysics.velocityDelta >= 0 ? '+' : ''}
                    {insights.pipelinePhysics.velocityDeltaPct}% vs prev
                  </div>
                </div>

                <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 space-y-1 relative">
                  <span className="text-[9px] uppercase tracking-wider text-tx-dim font-bold">Lead SLA Response</span>
                  <div className="text-[17px] font-black text-tx-bright">
                    {insights.pipelinePhysics.slaTouchTimeMins}m
                  </div>
                  <div className={`text-[9.5px] font-extrabold flex items-center gap-1 ${
                    insights.pipelinePhysics.slaTouchTimeDelta <= 0 ? 'text-mint' : 'text-coral'
                  }`}>
                    {insights.pipelinePhysics.slaTouchTimeDeltaPct}% vs prev
                  </div>
                </div>
              </div>

              {/* Cohorts chart */}
              <div className="h-24 w-full mt-2">
                <span className="text-[9px] uppercase tracking-wider text-tx-dim font-bold block mb-1">Conversion Cohort Speed</span>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={insights.pipelinePhysics.cohorts} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <XAxis dataKey="cohort" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: '#0c0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: 10 }} />
                    <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                      {insights.pipelinePhysics.cohorts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : index === 1 ? '#8b5cf6' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* LIVE QUOTA FORECAST */}
            <motion.div variants={fadeUp} className="app-card !p-6 h-[260px] flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-2">
                <h3 className="text-xs font-black text-tx-bright uppercase tracking-wider flex items-center gap-2">
                  <Target className="text-mint" size={14} /> Live Quota Forecast
                </h3>
                <span className="text-[8px] font-extrabold bg-white/[0.04] text-tx-dim border border-white/[0.08] px-1.5 py-0.5 rounded font-mono">
                  LIVE
                </span>
              </div>

              {/* Forecast bands comparison */}
              <div className="space-y-3 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-tx-dim">Monthly Target:</span>
                  <span className="text-tx-bright font-black">₹{insights.forecasting.target.toLocaleString('en-IN')}</span>
                </div>

                {/* Meter indicators */}
                <div className="space-y-2">
                  {[
                    { label: 'Commit (Worst Case)', value: insights.forecasting.commit, color: 'bg-coral', text: 'text-coral' },
                    { label: 'Most Likely Forecast', value: insights.forecasting.mostLikely, color: 'bg-violet', text: 'text-violet' },
                    { label: 'Best Case Scenario', value: insights.forecasting.bestCase, color: 'bg-mint', text: 'text-mint' }
                  ].map((band, bidx) => {
                    const pct = Math.min(100, Math.round((band.value / insights.forecasting.target) * 100));
                    
                    return (
                      <div key={bidx} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-tx-primary">{band.label}</span>
                          <span className={`${band.text} font-black`}>₹{band.value.toLocaleString('en-IN')} ({pct}%)</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden relative border border-white/[0.02]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${band.color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* SMART ROUTING CONTROLLER */}
            <motion.div variants={fadeUp} className="app-card !p-6 h-[250px] flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-2">
                <h3 className="text-xs font-black text-tx-bright uppercase tracking-wider flex items-center gap-2">
                  <Flame className="text-violet" size={14} /> Smart Routing Simulator
                </h3>
                <span className="text-[8px] font-extrabold bg-violet/10 text-violet border border-violet/25 px-1.5 py-0.5 rounded font-mono">
                  HOT HAND
                </span>
              </div>

              {/* Selector & result */}
              <div className="space-y-3 flex-1 flex flex-col justify-center">
                {routerLeads.length === 0 ? (
                  <p className="text-[10px] text-tx-dim italic text-center py-4">No active pipeline leads available to route.</p>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-tx-dim shrink-0">Lead:</label>
                      <select
                        value={selectedLeadId}
                        onChange={(e) => setSelectedLeadId(e.target.value)}
                        className="flex-1 bg-void border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-tx-bright outline-none focus:border-violet transition cursor-pointer"
                      >
                        {routerLeads.map(l => (
                          <option key={l.id} value={l.id}>{l.name || l.phone} (₹{(Number(l.revenue || 0)/1000).toFixed(0)}k)</option>
                        ))}
                      </select>
                    </div>

                    {routingSimulation && (
                      <div className="p-3 rounded-lg bg-white/[0.01] border border-white/[0.04] space-y-2">
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="text-tx-dim font-bold">Recommended Rep:</span>
                          <span className="text-violet font-black">{routingSimulation.recommendedRepName}</span>
                        </div>
                        <p className="text-[9.5px] text-tx-primary leading-relaxed italic border-l-2 border-violet/30 pl-2">
                          "{routingSimulation.rationale}"
                        </p>
                        
                        {/* Comparison breakdown */}
                        <div className="flex gap-2 justify-between pt-1 border-t border-white/[0.03]">
                          {routingSimulation.comparisons.map((c, idx) => (
                            <div key={idx} className="text-center">
                              <div className="text-[8px] font-bold text-tx-dim truncate max-w-[70px]">{c.repName}</div>
                              <div className={`text-[10px] font-black ${c.isBest ? 'text-violet' : 'text-tx-ghost'}`}>
                                WR: {c.sourceWinRate}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
