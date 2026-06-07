import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet, RefreshCw, CheckCircle2, AlertTriangle, Clock,
  Copy, ChevronRight, ExternalLink, Zap, Shield, ArrowDownToLine,
  ArrowUpFromLine, Settings, Activity, Database, Link2, Eye,
  Palette, Phone, MapPin, IndianRupee, MessageSquare, X,
  CloudUpload, CloudDownload, RotateCcw, Play, Sparkles
} from 'lucide-react';
import useSheetsSyncStore from '../../stores/useSheetsSyncStore';
import useLeadStore from '../../stores/useLeadStore';
import useUserStore from '../../stores/useUserStore';
import { generateAppsScript, generateSetupGuide } from '../../data/google-apps-script-template';
import { SPREADSHEET_ID, SHEET_TABS, SHEET_COLOR_LEGEND, normalizePhone, formatPhoneDisplay } from '../../services/sheetsSync';

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

export default function SheetsView() {
  const { leads } = useLeadStore();
  const { getCurrentUser } = useUserStore();
  const cur = getCurrentUser();

  const {
    syncStatus, lastSyncAt, lastSyncResult, syncLog,
    syncEnabled, toggleSync, appsScriptUrl, setAppsScriptUrl,
    errorMessage, triggerSync, resetSync,
  } = useSheetsSyncStore();

  const [activeSection, setActiveSection] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [scriptUrl, setScriptUrl] = useState(appsScriptUrl || '');
  const [showScript, setShowScript] = useState(false);

  // Stats from synced leads
  const syncStats = useMemo(() => {
    const sheetLeads = leads.filter(l => l.synced_from_sheet);
    const webLeads = sheetLeads.filter(l => l.lead_type === 'web_lead');
    const followUpLeads = sheetLeads.filter(l => l.lead_type === 'mass_data');
    const lastSync = sheetLeads.reduce((latest, l) => {
      const t = new Date(l.last_sheet_sync_at || 0);
      return t > latest ? t : latest;
    }, new Date(0));

    // Color distribution
    const colorDist = {};
    SHEET_COLOR_LEGEND.forEach(c => { colorDist[c.status] = 0; });
    sheetLeads.forEach(l => {
      const status = l.status || 'fresh_enquiry';
      if (colorDist[status] !== undefined) colorDist[status]++;
    });

    return {
      total: sheetLeads.length,
      webLeads: webLeads.length,
      followUpLeads: followUpLeads.length,
      lastSync: lastSync.getTime() > 0 ? lastSync : null,
      colorDist,
    };
  }, [leads]);

  const setupGuide = generateSetupGuide();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const scriptCode = generateAppsScript(supabaseUrl, supabaseKey, cur?.id);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSaveUrl = () => {
    setAppsScriptUrl(scriptUrl);
  };

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;

  const statusColors = {
    idle: 'text-tx-ghost',
    syncing: 'text-amber-400',
    success: 'text-emerald-400',
    error: 'text-rose-400',
  };

  const statusIcons = {
    idle: Clock,
    syncing: RefreshCw,
    success: CheckCircle2,
    error: AlertTriangle,
  };

  const StatusIcon = statusIcons[syncStatus] || Clock;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ═══ HERO HEADER ═══ */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d4a2f]/40 via-[#0b1a2e]/60 to-[#1a0d3d]/40" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-emerald-500/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-radial from-violet-500/8 to-transparent" />

        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-green-600/15 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                <FileSpreadsheet size={24} className="text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-black text-tx-bright tracking-tight flex items-center gap-2">
                  Google Sheets Sync
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                    syncEnabled
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-white/[0.03] border-white/[0.08] text-tx-ghost'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${syncEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-tx-ghost'}`} />
                    {syncEnabled ? 'LIVE' : 'OFF'}
                  </span>
                </h1>
                <p className="text-xs text-tx-ghost mt-0.5">
                  Bi-directional sync between your Google Sheets and SalesOS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-tx-dim text-xs font-bold hover:bg-white/[0.06] transition"
              >
                <ExternalLink size={13} /> Open Sheet
              </a>
              <button
                onClick={() => triggerSync()}
                disabled={syncStatus === 'syncing'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] text-white text-xs font-bold disabled:opacity-40 transition active:scale-95"
              >
                <RefreshCw size={13} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/[0.05]">
            <div className="flex items-center gap-2">
              <StatusIcon size={13} className={`${statusColors[syncStatus]} ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColors[syncStatus]}`}>
                {syncStatus === 'idle' ? 'Ready' : syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'success' ? 'Synced' : 'Error'}
              </span>
            </div>
            {lastSyncAt && (
              <span className="text-[10px] text-tx-ghost">
                Last sync: {new Date(lastSyncAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </span>
            )}
            {lastSyncResult && (
              <span className="text-[10px] text-tx-dim font-mono">
                +{lastSyncResult.inserted} new · {lastSyncResult.updated} updated · {lastSyncResult.unchanged} unchanged
              </span>
            )}
            {errorMessage && (
              <span className="text-[10px] text-rose-400 truncate max-w-xs">{errorMessage}</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* ═══ STATS CARDS ═══ */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Synced', value: syncStats.total, icon: Database, color: 'from-cyan/20 to-blue-500/10', textColor: 'text-cyan', borderColor: 'border-cyan/15' },
          { label: 'Web Leads', value: syncStats.webLeads, icon: Link2, color: 'from-violet-500/20 to-purple-500/10', textColor: 'text-violet-400', borderColor: 'border-violet-500/15' },
          { label: 'Follow Up', value: syncStats.followUpLeads, icon: Phone, color: 'from-amber-500/20 to-orange-500/10', textColor: 'text-amber-400', borderColor: 'border-amber-500/15' },
          { label: 'Sync Events', value: syncLog.length, icon: Activity, color: 'from-emerald-500/20 to-green-500/10', textColor: 'text-emerald-400', borderColor: 'border-emerald-500/15' },
        ].map((card) => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} border ${card.borderColor} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={14} className={card.textColor} />
              <span className="text-[10px] font-bold text-tx-ghost uppercase tracking-wider">{card.label}</span>
            </div>
            <p className={`text-2xl font-black ${card.textColor}`}>{card.value}</p>
          </div>
        ))}
      </motion.div>

      {/* ═══ SECTION TABS ═══ */}
      <motion.div variants={fadeUp} className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-1.5">
        {[
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: 'setup', label: 'Setup Guide', icon: Settings },
          { id: 'color-map', label: 'Color Map', icon: Palette },
          { id: 'log', label: 'Sync Log', icon: Activity },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSection === tab.id
                ? 'bg-white/[0.08] text-tx-bright shadow-sm'
                : 'text-tx-ghost hover:text-tx-dim hover:bg-white/[0.03]'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* ═══ SECTION CONTENT ═══ */}
      <AnimatePresence mode="wait">
        {activeSection === 'overview' && (
          <motion.div key="overview" variants={fadeUp} initial="hidden" animate="show" exit="hidden" className="grid lg:grid-cols-2 gap-4">
            {/* Sheet Tabs Card */}
            <div className="bg-[#0d1525]/80 border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={14} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-tx-bright">Connected Sheets</h3>
                </div>
                <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-tx-ghost hover:text-cyan flex items-center gap-1">
                  Open <ExternalLink size={10} />
                </a>
              </div>
              <div className="p-4 space-y-3">
                {SHEET_TABS.map(tab => {
                  const count = tab.leadType === 'web_lead' ? syncStats.webLeads : syncStats.followUpLeads;
                  return (
                    <div key={tab.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{tab.icon}</span>
                        <div>
                          <p className="text-xs font-bold text-tx-bright">{tab.label}</p>
                          <p className="text-[10px] text-tx-ghost">{count} leads synced</p>
                        </div>
                      </div>
                      <button
                        onClick={() => triggerSync(tab.id)}
                        disabled={syncStatus === 'syncing'}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-bold text-tx-dim hover:bg-white/[0.08] transition disabled:opacity-30"
                      >
                        <RefreshCw size={10} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sync Direction Card */}
            <div className="bg-[#0d1525]/80 border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <h3 className="text-sm font-bold text-tx-bright flex items-center gap-2">
                  <Zap size={14} className="text-amber-400" /> How Sync Works
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <CloudUpload size={16} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-400">Sheet → SalesOS</p>
                    <p className="text-[10px] text-tx-ghost">Auto on every cell edit via Apps Script trigger</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                  <CloudDownload size={16} className="text-violet-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-violet-400">SalesOS → Sheet</p>
                    <p className="text-[10px] text-tx-ghost">Via "Pull from SalesOS" menu in the sheet</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan/5 border border-cyan/10">
                  <Shield size={16} className="text-cyan flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-cyan">Dedup by Phone</p>
                    <p className="text-[10px] text-tx-ghost">Same phone = same lead. No duplicates ever.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Sync Events */}
            {syncLog.length > 0 && (
              <div className="lg:col-span-2 bg-[#0d1525]/80 border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                  <h3 className="text-sm font-bold text-tx-bright flex items-center gap-2">
                    <Activity size={14} className="text-cyan" /> Recent Activity
                  </h3>
                  <button onClick={resetSync} className="text-[10px] text-tx-ghost hover:text-rose-400 flex items-center gap-1">
                    <RotateCcw size={10} /> Clear
                  </button>
                </div>
                <div className="divide-y divide-white/[0.03] max-h-60 overflow-y-auto">
                  {syncLog.slice(0, 10).map((entry, i) => (
                    <div key={i} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${entry.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="text-xs text-tx-dim">{entry.action?.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-tx-bright">{entry.count} rows</span>
                        <span className="text-[10px] text-tx-ghost font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeSection === 'setup' && (
          <motion.div key="setup" variants={fadeUp} initial="hidden" animate="show" exit="hidden" className="space-y-4">
            {/* Step-by-step guide */}
            <div className="bg-[#0d1525]/80 border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <h3 className="text-sm font-bold text-tx-bright flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-400" /> Quick Setup (5 minutes)
                </h3>
              </div>
              <div className="p-5 space-y-4">
                {setupGuide.map((step) => (
                  <div key={step.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center text-sm flex-shrink-0">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-tx-bright">
                        Step {step.step}: {step.title}
                      </p>
                      <p className="text-[11px] text-tx-ghost mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Script Code Block */}
            <div className="bg-[#0d1525]/80 border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <h3 className="text-sm font-bold text-tx-bright flex items-center gap-2">
                  <FileSpreadsheet size={14} className="text-emerald-400" /> Apps Script Code
                </h3>
                <button
                  onClick={handleCopyScript}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                    copied
                      ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400'
                      : 'bg-white/[0.04] border border-white/[0.08] text-tx-dim hover:bg-white/[0.08]'
                  }`}
                >
                  {copied ? <><CheckCircle2 size={12} /> Copied!</> : <><Copy size={12} /> Copy Script</>}
                </button>
              </div>

              <div className="p-4">
                <div className="bg-[#070b15] border border-white/[0.04] rounded-xl p-1">
                  <button
                    onClick={() => setShowScript(!showScript)}
                    className="w-full flex items-center justify-between px-4 py-3 text-xs text-tx-ghost hover:text-tx-dim"
                  >
                    <span className="font-mono text-[10px]">// SalesOS Google Sheets Sync Script ({scriptCode.split('\n').length} lines)</span>
                    <ChevronRight size={12} className={`transition ${showScript ? 'rotate-90' : ''}`} />
                  </button>
                  {showScript && (
                    <pre className="px-4 pb-4 text-[10px] text-emerald-400/80 font-mono overflow-auto max-h-96 leading-relaxed whitespace-pre-wrap">
                      {scriptCode}
                    </pre>
                  )}
                </div>
              </div>

              {/* Supabase config preview */}
              <div className="px-5 pb-4">
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-emerald-400 mb-1">✅ Auto-configured with your Supabase credentials</p>
                  <p className="text-[10px] text-tx-ghost font-mono truncate">
                    URL: {supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : 'Not configured'}
                  </p>
                </div>
              </div>
            </div>

            {/* Apps Script Web App URL Input */}
            <div className="bg-[#0d1525]/80 border border-white/[0.06] rounded-2xl overflow-hidden p-5 space-y-3">
              <h3 className="text-sm font-bold text-tx-bright flex items-center gap-2">
                <Settings size={14} className="text-electric" /> Connection URL Settings
              </h3>
              <p className="text-[11px] text-tx-ghost">
                Paste the copied Google Apps Script Web App URL below to link the dashboard:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scriptUrl}
                  onChange={(e) => setScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-tx-bright outline-none focus:border-electric/30 font-sans"
                />
                <button
                  onClick={handleSaveUrl}
                  className="px-4 py-2 bg-gradient-to-r from-electric to-blue-600 rounded-xl text-xs font-bold text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition"
                >
                  Save URL
                </button>
              </div>
              {appsScriptUrl && (
                <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} /> Connected URL: {appsScriptUrl.slice(0, 45)}...
                </p>
              )}
            </div>
          </motion.div>
        )}

        {activeSection === 'color-map' && (
          <motion.div key="color-map" variants={fadeUp} initial="hidden" animate="show" exit="hidden">
            <div className="bg-[#0d1525]/80 border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <h3 className="text-sm font-bold text-tx-bright flex items-center gap-2">
                  <Palette size={14} className="text-violet-400" /> Color → Status Mapping
                </h3>
                <p className="text-[10px] text-tx-ghost mt-1">
                  When you color a row in Google Sheets, it automatically updates the lead's status in SalesOS
                </p>
              </div>
              <div className="p-5 space-y-3">
                {SHEET_COLOR_LEGEND.map((item) => {
                  const count = syncStats.colorDist[item.status] || 0;
                  return (
                    <div key={item.status} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-8 h-8 rounded-lg border border-white/[0.1] shadow-inner"
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <p className="text-xs font-bold text-tx-bright">{item.label}</p>
                          <p className="text-[10px] text-tx-ghost">→ Pipeline: <span className="text-cyan font-mono">{item.status}</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-tx-bright">{count}</p>
                        <p className="text-[9px] text-tx-ghost uppercase">leads</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'log' && (
          <motion.div key="log" variants={fadeUp} initial="hidden" animate="show" exit="hidden">
            <div className="bg-[#0d1525]/80 border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <h3 className="text-sm font-bold text-tx-bright flex items-center gap-2">
                  <Activity size={14} className="text-cyan" /> Full Sync Log
                </h3>
                {syncLog.length > 0 && (
                  <button onClick={resetSync} className="text-[10px] text-tx-ghost hover:text-rose-400 flex items-center gap-1">
                    <RotateCcw size={10} /> Clear All
                  </button>
                )}
              </div>
              {syncLog.length === 0 ? (
                <div className="p-12 text-center">
                  <Activity size={24} className="text-tx-ghost mx-auto mb-3 opacity-30" />
                  <p className="text-xs text-tx-ghost">No sync events yet</p>
                  <p className="text-[10px] text-tx-ghost mt-1">Set up the Apps Script and click "Sync Now" to start</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.03] max-h-[60vh] overflow-y-auto">
                  {syncLog.map((entry, i) => (
                    <div key={i} className="px-5 py-3.5 hover:bg-white/[0.02] transition">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${entry.status === 'success' ? 'bg-emerald-400' : entry.status === 'error' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                          <span className="text-xs font-bold text-tx-bright capitalize">{entry.action?.replace(/_/g, ' ')}</span>
                        </div>
                        <span className="text-[10px] text-tx-ghost font-mono">
                          {new Date(entry.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {entry.details && typeof entry.details === 'object' && (
                        <p className="text-[10px] text-tx-ghost ml-4 font-mono">
                          +{entry.details.inserted || 0} new · {entry.details.updated || 0} updated
                          {entry.details.errors && ` · ${entry.details.errors.length} errors`}
                        </p>
                      )}
                      {entry.details && typeof entry.details === 'string' && (
                        <p className="text-[10px] text-rose-400/70 ml-4 font-mono truncate">{entry.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
