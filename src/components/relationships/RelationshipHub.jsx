import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Mail, Phone, CalendarDays, StickyNote, Brain,
  Signal, TrendingUp, ChevronRight, Star, Shield, Code2,
  MessageSquare, Video, FileText, ArrowUpRight, Zap, Eye,
  Download, MousePointerClick, Clock, Users, Sparkles,
} from 'lucide-react';
import { spring, stagger, fadeIn, slideUp, scaleIn } from '../../motion/index.js';

/* ─── Hardcoded Contacts ─────────────────────────────────────────── */
const CONTACTS = [
  {
    id: '1',
    name: 'Sarah Chen',
    title: 'VP of Engineering',
    company: 'Acme Corp',
    initials: 'SC',
    color: '#6366f1',
    sentiment: 'positive',
    lastInteraction: '2h ago',
    engagementScore: 94,
    role: ['Champion', 'Decision Maker'],
    type: 'executive',
    email: 's.chen@acmecorp.com',
    phone: '+1 (415) 555-0142',
    aiMemory: [
      'Prefers async communication via Slack',
      'Strong advocate for API-first architecture',
      'Concerned about migration timeline from legacy systems',
      'Reports directly to CTO Marcus Webb',
      'Previously led engineering at Stripe (2018-2022)',
      'Budget authority up to $500K',
    ],
    buyingSignals: [
      { text: 'Visited pricing page 5x this week', strength: 5 },
      { text: 'Downloaded enterprise security whitepaper', strength: 4 },
      { text: 'Shared product demo with 3 team members', strength: 5 },
      { text: 'Asked about SOC 2 compliance', strength: 3 },
    ],
    timeline: [
      { type: 'email', desc: 'Sent ROI analysis document', time: '2h ago', sentiment: 'positive' },
      { type: 'meeting', desc: 'Technical deep-dive with eng team', time: '1d ago', sentiment: 'positive' },
      { type: 'call', desc: 'Discovery call — discussed pain points', time: '3d ago', sentiment: 'positive' },
      { type: 'note', desc: 'Budget approved internally for Q2', time: '5d ago', sentiment: 'positive' },
      { type: 'deal', desc: 'Deal moved to Technical Evaluation', time: '1w ago', sentiment: 'neutral' },
      { type: 'email', desc: 'Initial outreach — warm intro from VC', time: '2w ago', sentiment: 'neutral' },
    ],
  },
  {
    id: '2',
    name: 'Marcus Webb',
    title: 'CTO',
    company: 'Acme Corp',
    initials: 'MW',
    color: '#10b981',
    sentiment: 'neutral',
    lastInteraction: '1d ago',
    engagementScore: 78,
    role: ['Decision Maker'],
    type: 'executive',
    email: 'm.webb@acmecorp.com',
    phone: '+1 (415) 555-0198',
    aiMemory: [
      'Focused on reducing infrastructure costs by 30%',
      'Skeptical of vendor lock-in — prefers open standards',
      'Final decision maker for enterprise contracts',
      'Reads every technical spec before approving',
      'Available only Tue/Thu mornings for calls',
    ],
    buyingSignals: [
      { text: 'Reviewed technical architecture docs', strength: 4 },
      { text: 'Connected on LinkedIn', strength: 2 },
      { text: 'Attended industry webinar we sponsored', strength: 3 },
    ],
    timeline: [
      { type: 'meeting', desc: 'Executive briefing on platform vision', time: '1d ago', sentiment: 'neutral' },
      { type: 'email', desc: 'Forwarded competitor comparison from Sarah', time: '4d ago', sentiment: 'neutral' },
      { type: 'call', desc: 'Brief intro call — 15 min', time: '1w ago', sentiment: 'positive' },
    ],
  },
  {
    id: '3',
    name: 'Priya Patel',
    title: 'Head of Product',
    company: 'NovaTech',
    initials: 'PP',
    color: '#f59e0b',
    sentiment: 'positive',
    lastInteraction: '4h ago',
    engagementScore: 91,
    role: ['Champion', 'Technical'],
    type: 'champion',
    email: 'priya@novatech.io',
    phone: '+1 (628) 555-0234',
    aiMemory: [
      'Highly technical — previously a Staff Engineer',
      'Excited about AI-driven analytics features',
      'Wants live dashboard for her product metrics team',
      'Champion internally — evangelizing to leadership',
      'Blocked once by procurement process; now resolved',
    ],
    buyingSignals: [
      { text: 'Requested custom demo for leadership', strength: 5 },
      { text: 'Engaged with 4 marketing emails', strength: 4 },
      { text: 'Signed up for beta program', strength: 5 },
      { text: 'Invited us to internal tech talk', strength: 4 },
    ],
    timeline: [
      { type: 'email', desc: 'Sent personalized product roadmap', time: '4h ago', sentiment: 'positive' },
      { type: 'meeting', desc: 'Product demo for leadership team', time: '2d ago', sentiment: 'positive' },
      { type: 'note', desc: 'Procurement approved vendor evaluation', time: '5d ago', sentiment: 'positive' },
      { type: 'call', desc: 'Weekly sync — addressed API questions', time: '1w ago', sentiment: 'positive' },
    ],
  },
  {
    id: '4',
    name: 'James Morrison',
    title: 'CFO',
    company: 'Vertex Industries',
    initials: 'JM',
    color: '#ef4444',
    sentiment: 'negative',
    lastInteraction: '3d ago',
    engagementScore: 34,
    role: ['Blocker'],
    type: 'blocker',
    email: 'j.morrison@vertex.com',
    phone: '+1 (312) 555-0567',
    aiMemory: [
      'Primary concern is ROI justification',
      'Pushed back on annual contract — wants monthly',
      'Has veto power over software purchases > $100K',
      'Was burned by a failed SaaS migration last year',
      'Responds only to hard financial data, not features',
    ],
    buyingSignals: [
      { text: 'Opened pricing email once', strength: 1 },
      { text: 'No website visits in 30 days', strength: 1 },
    ],
    timeline: [
      { type: 'email', desc: 'Sent customized ROI calculator', time: '3d ago', sentiment: 'neutral' },
      { type: 'call', desc: 'Budget objection — wants case studies', time: '1w ago', sentiment: 'negative' },
      { type: 'meeting', desc: 'Initial meeting — expressed skepticism', time: '2w ago', sentiment: 'negative' },
    ],
  },
  {
    id: '5',
    name: 'Aisha Williams',
    title: 'Director of Operations',
    company: 'Helios Group',
    initials: 'AW',
    color: '#8b5cf6',
    sentiment: 'positive',
    lastInteraction: '6h ago',
    engagementScore: 87,
    role: ['Champion', 'Decision Maker'],
    type: 'champion',
    email: 'a.williams@helios.com',
    phone: '+1 (646) 555-0891',
    aiMemory: [
      'Needs solution for 200+ person ops team',
      'Currently using 4 separate tools — wants consolidation',
      'Prefers video calls over phone',
      'Highly responsive — typically replies within 2 hours',
      'Authorized to sign contracts up to $250K',
    ],
    buyingSignals: [
      { text: 'Visited pricing page 3x', strength: 4 },
      { text: 'Downloaded case study', strength: 3 },
      { text: 'Engaged with 2 emails this week', strength: 3 },
      { text: 'Asked for customer references', strength: 4 },
    ],
    timeline: [
      { type: 'email', desc: 'Shared customer reference list', time: '6h ago', sentiment: 'positive' },
      { type: 'meeting', desc: 'Stakeholder alignment call', time: '2d ago', sentiment: 'positive' },
      { type: 'deal', desc: 'Deal moved to Negotiation stage', time: '4d ago', sentiment: 'positive' },
    ],
  },
  {
    id: '6',
    name: 'David Kim',
    title: 'Senior Architect',
    company: 'Acme Corp',
    initials: 'DK',
    color: '#06b6d4',
    sentiment: 'neutral',
    lastInteraction: '1d ago',
    engagementScore: 65,
    role: ['Technical'],
    type: 'executive',
    email: 'd.kim@acmecorp.com',
    phone: '+1 (415) 555-0321',
    aiMemory: [
      'Evaluating our API against GraphQL alternatives',
      'Wants SDK support for Rust and Go',
      'Concerned about latency under 50ms SLA',
      'Reports to Sarah Chen',
    ],
    buyingSignals: [
      { text: 'Cloned API sandbox repo', strength: 4 },
      { text: 'Submitted 3 technical questions via docs', strength: 3 },
      { text: 'Ran load test against staging environment', strength: 5 },
    ],
    timeline: [
      { type: 'email', desc: 'Sent performance benchmarks doc', time: '1d ago', sentiment: 'neutral' },
      { type: 'call', desc: 'Technical Q&A — 45 min deep dive', time: '3d ago', sentiment: 'positive' },
      { type: 'note', desc: 'Requested Go SDK timeline', time: '1w ago', sentiment: 'neutral' },
    ],
  },
  {
    id: '7',
    name: 'Elena Rodriguez',
    title: 'VP of Sales',
    company: 'Crescendo Health',
    initials: 'ER',
    color: '#ec4899',
    sentiment: 'positive',
    lastInteraction: '5h ago',
    engagementScore: 88,
    role: ['Champion'],
    type: 'champion',
    email: 'elena@crescendo.health',
    phone: '+1 (305) 555-0432',
    aiMemory: [
      'Needs HIPAA-compliant analytics dashboard',
      'Team of 45 sales reps — looking for coaching tools',
      'Expanding into 3 new markets this quarter',
      'Very enthusiastic about AI forecasting features',
    ],
    buyingSignals: [
      { text: 'Requested SOC 2 + HIPAA documentation', strength: 4 },
      { text: 'Shared demo recording with CEO', strength: 5 },
      { text: 'Asked about implementation timeline', strength: 4 },
    ],
    timeline: [
      { type: 'meeting', desc: 'Custom demo for sales leadership', time: '5h ago', sentiment: 'positive' },
      { type: 'email', desc: 'Sent compliance documentation', time: '2d ago', sentiment: 'positive' },
      { type: 'call', desc: 'Discovery call — mapped requirements', time: '5d ago', sentiment: 'positive' },
    ],
  },
  {
    id: '8',
    name: 'Tom Bradley',
    title: 'Procurement Manager',
    company: 'Vertex Industries',
    initials: 'TB',
    color: '#f97316',
    sentiment: 'neutral',
    lastInteraction: '2d ago',
    engagementScore: 42,
    role: ['Blocker'],
    type: 'blocker',
    email: 't.bradley@vertex.com',
    phone: '+1 (312) 555-0789',
    aiMemory: [
      'Strictly follows 90-day vendor evaluation process',
      'Requires 3 competing bids before approval',
      'Wants volume discount for 500+ seats',
      'Has final sign-off on all vendor contracts',
    ],
    buyingSignals: [
      { text: 'Downloaded vendor evaluation template', strength: 2 },
      { text: 'Visited security page once', strength: 1 },
    ],
    timeline: [
      { type: 'email', desc: 'Sent competitive pricing proposal', time: '2d ago', sentiment: 'neutral' },
      { type: 'call', desc: 'Procurement requirements discussion', time: '1w ago', sentiment: 'neutral' },
    ],
  },
  {
    id: '9',
    name: 'Lisa Zhang',
    title: 'CEO',
    company: 'NovaTech',
    initials: 'LZ',
    color: '#14b8a6',
    sentiment: 'positive',
    lastInteraction: '1d ago',
    engagementScore: 82,
    role: ['Decision Maker'],
    type: 'executive',
    email: 'lisa@novatech.io',
    phone: '+1 (628) 555-0156',
    aiMemory: [
      'Visionary leader — Series C company ($80M raised)',
      'Cares deeply about data privacy and sovereignty',
      'Introduced by board member Janet Liu',
      'Wants strategic partnership, not just a vendor',
    ],
    buyingSignals: [
      { text: 'Attended our annual conference keynote', strength: 4 },
      { text: 'Connected C-suite team on LinkedIn', strength: 3 },
      { text: 'Mentioned us in investor update', strength: 5 },
    ],
    timeline: [
      { type: 'meeting', desc: 'Executive dinner — strategic alignment', time: '1d ago', sentiment: 'positive' },
      { type: 'email', desc: 'Sent partnership proposal framework', time: '4d ago', sentiment: 'positive' },
    ],
  },
  {
    id: '10',
    name: 'Ryan O\'Connor',
    title: 'Engineering Manager',
    company: 'Helios Group',
    initials: 'RO',
    color: '#a855f7',
    sentiment: 'neutral',
    lastInteraction: '3d ago',
    engagementScore: 56,
    role: ['Technical'],
    type: 'executive',
    email: 'r.oconnor@helios.com',
    phone: '+1 (646) 555-0234',
    aiMemory: [
      'Managing integration with existing Salesforce instance',
      'Team uses Jira — wants bidirectional sync',
      'Prefers detailed technical documentation over calls',
      'Reports to Aisha Williams',
    ],
    buyingSignals: [
      { text: 'Read 12 API documentation pages', strength: 4 },
      { text: 'Created test account in sandbox', strength: 3 },
    ],
    timeline: [
      { type: 'email', desc: 'Sent integration architecture diagram', time: '3d ago', sentiment: 'neutral' },
      { type: 'call', desc: 'Integration planning call', time: '1w ago', sentiment: 'positive' },
    ],
  },
];

const FILTER_PILLS = [
  { id: 'all', label: 'All' },
  { id: 'executive', label: 'Executives' },
  { id: 'champion', label: 'Champions' },
  { id: 'blocker', label: 'Blockers' },
];

const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral: '#f59e0b',
  negative: '#ef4444',
};

const EVENT_ICONS = {
  email: Mail,
  call: Phone,
  meeting: Video,
  note: StickyNote,
  deal: TrendingUp,
};

const EVENT_COLORS = {
  email: 'text-indigo-400',
  call: 'text-emerald-400',
  meeting: 'text-amber-400',
  note: 'text-violet-400',
  deal: 'text-cyan-400',
};

/* ─── Signal Strength Bars ───────────────────────────────────────── */
function SignalBars({ strength }) {
  return (
    <div className="flex items-end gap-[2px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full transition-all"
          style={{
            height: `${6 + i * 3}px`,
            backgroundColor: i <= strength ? '#6366f1' : 'rgba(255,255,255,0.08)',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Contact List Item ──────────────────────────────────────────── */
function ContactCard({ contact, isActive, onSelect }) {
  return (
    <motion.button
      onClick={() => onSelect(contact.id)}
      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 group ${
        isActive
          ? 'bg-indigo-500/[0.08] border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.06)]'
          : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]'
      }`}
      variants={stagger.item}
      layout
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-lg"
          style={{ backgroundColor: contact.color }}
        >
          {contact.initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-bold text-white truncate">
              {contact.name}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-zinc-500">
                {contact.lastInteraction}
              </span>
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: SENTIMENT_COLORS[contact.sentiment] }}
              />
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
            {contact.title} · {contact.company}
          </p>
        </div>

        {/* Engagement Score Badge */}
        <div
          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
            contact.engagementScore >= 80
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : contact.engagementScore >= 50
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {contact.engagementScore}
        </div>
      </div>
    </motion.button>
  );
}

/* ─── Contact Detail Panel ───────────────────────────────────────── */
function ContactDetail({ contact }) {
  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Users size={48} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 text-sm font-medium">Select a contact to view details</p>
          <p className="text-zinc-600 text-xs mt-1">Relationship intelligence will appear here</p>
        </div>
      </div>
    );
  }

  const actionButtons = [
    { icon: Mail, label: 'Email', color: 'indigo' },
    { icon: Phone, label: 'Call', color: 'emerald' },
    { icon: CalendarDays, label: 'Meeting', color: 'amber' },
    { icon: StickyNote, label: 'Note', color: 'violet' },
  ];

  return (
    <motion.div
      key={contact.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={spring.gentle}
      className="flex-1 overflow-y-auto hide-scrollbar"
    >
      <div className="p-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-lg"
              style={{
                backgroundColor: contact.color,
                boxShadow: `0 8px 32px ${contact.color}33`,
              }}
            >
              {contact.initials}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">{contact.name}</h2>
              <p className="text-sm text-zinc-400 mt-0.5">{contact.title}</p>
              <p className="text-xs text-zinc-500">{contact.company}</p>
              <div className="flex items-center gap-2 mt-2">
                {contact.role.map((r) => (
                  <span
                    key={r}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      r === 'Champion'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : r === 'Decision Maker'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        : r === 'Technical'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Engagement Score */}
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-extrabold border-2"
              style={{
                borderColor: contact.engagementScore >= 80 ? '#10b981' : contact.engagementScore >= 50 ? '#f59e0b' : '#ef4444',
                color: contact.engagementScore >= 80 ? '#10b981' : contact.engagementScore >= 50 ? '#f59e0b' : '#ef4444',
                boxShadow: `0 0 20px ${contact.engagementScore >= 80 ? '#10b98120' : contact.engagementScore >= 50 ? '#f59e0b20' : '#ef444420'}`,
              }}
            >
              {contact.engagementScore}
            </div>
            <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">Score</p>
          </div>
        </div>

        {/* ── Communication Actions ── */}
        <div className="flex items-center gap-2">
          {actionButtons.map(({ icon: Icon, label, color }) => (
            <motion.button
              key={label}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={spring.snappy}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all
                bg-${color}-500/[0.04] border-${color}-500/10 hover:border-${color}-500/30
                hover:shadow-[0_0_16px_rgba(99,102,241,0.08)]`}
              style={{
                backgroundColor: `color-mix(in srgb, var(--${color}, #6366f1) 4%, transparent)`,
              }}
            >
              <Icon size={14} className="text-zinc-300" />
              <span className="text-[11px] font-bold text-zinc-300">{label}</span>
            </motion.button>
          ))}
        </div>

        {/* ── AI Relationship Memory ── */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-indigo-500/10">
              <Brain size={16} className="text-indigo-400" />
            </div>
            <h3 className="text-sm font-bold text-white">AI Relationship Memory</h3>
            <Sparkles size={12} className="text-indigo-400 animate-pulse" />
          </div>
          <ul className="space-y-2.5">
            {contact.aiMemory.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring.gentle, delay: i * 0.05 }}
                className="flex items-start gap-2.5 text-[12px] text-zinc-300"
              >
                <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span>{item}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* ── Engagement Timeline ── */}
        <div>
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={14} className="text-zinc-500" />
            Engagement Timeline
          </h3>
          <div className="relative">
            {/* Timeline Line */}
            <div
              className="absolute left-[19px] top-0 bottom-0 w-[2px]"
              style={{
                background: 'linear-gradient(180deg, #6366f1 0%, rgba(99,102,241,0.1) 100%)',
              }}
            />

            <div className="space-y-1">
              {contact.timeline.map((event, i) => {
                const Icon = EVENT_ICONS[event.type] || Mail;
                const colorClass = EVENT_COLORS[event.type] || 'text-zinc-400';
                const isLeft = i % 2 === 0;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring.gentle, delay: i * 0.06 }}
                    className="relative flex items-start gap-4 pl-0"
                  >
                    {/* Node */}
                    <div
                      className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all
                        bg-zinc-900 border-white/[0.08]`}
                    >
                      <Icon size={14} className={colorClass} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] text-zinc-200 font-medium">{event.desc}</p>
                          <div
                            className="w-2 h-2 rounded-full shrink-0 ml-2"
                            style={{ backgroundColor: SENTIMENT_COLORS[event.sentiment] }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1 font-mono">{event.time}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Buying Signals ── */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <Signal size={16} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Buying Signals</h3>
          </div>
          <div className="space-y-3">
            {contact.buyingSignals.map((signal, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring.gentle, delay: i * 0.05 }}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Zap size={12} className="text-amber-400 shrink-0" />
                  <span className="text-[12px] text-zinc-300 truncate">{signal.text}</span>
                </div>
                <SignalBars strength={signal.strength} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function RelationshipHub() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(CONTACTS[0].id);

  const filteredContacts = useMemo(() => {
    let list = CONTACTS;

    if (filter !== 'all') {
      if (filter === 'executive') list = list.filter((c) => c.type === 'executive');
      else if (filter === 'champion') list = list.filter((c) => c.type === 'champion');
      else if (filter === 'blocker') list = list.filter((c) => c.type === 'blocker');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q)
      );
    }

    return list;
  }, [search, filter]);

  const selectedContact = CONTACTS.find((c) => c.id === selectedId) || null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={spring.gentle}
      className="flex h-[calc(100vh-64px)] bg-[#09090b] overflow-hidden"
    >
      {/* ── Left: Contact List ── */}
      <div className="w-[350px] shrink-0 border-r border-white/[0.06] flex flex-col bg-white/[0.01]">
        {/* Search & Filters */}
        <div className="p-4 space-y-3 border-b border-white/[0.06]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500/40 transition placeholder:text-zinc-600 backdrop-blur-xl"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill.id}
                onClick={() => setFilter(pill.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                  filter === pill.id
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.08)]'
                    : 'bg-transparent border-white/[0.04] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contact List */}
        <motion.div
          className="flex-1 overflow-y-auto p-3 space-y-1.5 hide-scrollbar"
          variants={stagger.container(0.03)}
          initial="initial"
          animate="animate"
        >
          {filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              isActive={contact.id === selectedId}
              onSelect={setSelectedId}
            />
          ))}
          {filteredContacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={24} className="text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-500">No contacts found</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Right: Contact Detail ── */}
      <AnimatePresence mode="wait">
        <ContactDetail contact={selectedContact} />
      </AnimatePresence>
    </motion.div>
  );
}
