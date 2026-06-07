// ══════════════════════════════════════════════════════
// SALES COMMAND OS v5 — ALGO TRADING SALES FUNNEL
// 9-Stage Pipeline | Payment Tracking | AI Intelligence
// ══════════════════════════════════════════════════════

// ── PIPELINE STAGES (9 stages: Entry → Conversion) ──

export const STAGES = {
  FRESH_ENQUIRY: 'fresh_enquiry',
  FIRST_CALL: 'first_call',
  NPC_RETRY: 'npc_retry',
  DISCOVERY: 'discovery',
  DEMO_SCHEDULED: 'demo_scheduled',
  DEMO_DONE: 'demo_done',
  NEGOTIATION: 'negotiation',
  CONVERTED: 'converted',
  LOST: 'lost',
};

// Active pipeline stages (shown in Kanban — excludes Lost)
export const PIPELINE_STAGES = [
  STAGES.FRESH_ENQUIRY,
  STAGES.FIRST_CALL,
  STAGES.NPC_RETRY,
  STAGES.DISCOVERY,
  STAGES.DEMO_SCHEDULED,
  STAGES.DEMO_DONE,
  STAGES.NEGOTIATION,
  STAGES.CONVERTED,
];

// All stages in logical order
export const STAGE_ORDER = [...PIPELINE_STAGES, STAGES.LOST];

export const STAGE_LABELS = {
  [STAGES.FRESH_ENQUIRY]: 'Fresh Enquiry',
  [STAGES.FIRST_CALL]: 'First Call',
  [STAGES.NPC_RETRY]: 'NPC / Retry',
  [STAGES.DISCOVERY]: 'Discovery',
  [STAGES.DEMO_SCHEDULED]: 'Demo Scheduled',
  [STAGES.DEMO_DONE]: 'Demo Done',
  [STAGES.NEGOTIATION]: 'Negotiation',
  [STAGES.CONVERTED]: 'Converted',
  [STAGES.LOST]: 'Lost',
};

export const STAGE_ICONS = {
  [STAGES.FRESH_ENQUIRY]: '📩',
  [STAGES.FIRST_CALL]: '📞',
  [STAGES.NPC_RETRY]: '🔄',
  [STAGES.DISCOVERY]: '🔍',
  [STAGES.DEMO_SCHEDULED]: '📅',
  [STAGES.DEMO_DONE]: '✅',
  [STAGES.NEGOTIATION]: '💬',
  [STAGES.CONVERTED]: '💰',
  [STAGES.LOST]: '❌',
};

export const STAGE_CSS = {
  [STAGES.FRESH_ENQUIRY]: 'stage-fresh-enquiry',
  [STAGES.FIRST_CALL]: 'stage-first-call',
  [STAGES.NPC_RETRY]: 'stage-npc-retry',
  [STAGES.DISCOVERY]: 'stage-discovery',
  [STAGES.DEMO_SCHEDULED]: 'stage-demo-scheduled',
  [STAGES.DEMO_DONE]: 'stage-demo-done',
  [STAGES.NEGOTIATION]: 'stage-negotiation',
  [STAGES.CONVERTED]: 'stage-converted',
  [STAGES.LOST]: 'stage-lost',
};

export const STAGE_COLORS = {
  [STAGES.FRESH_ENQUIRY]: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
  [STAGES.FIRST_CALL]: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  [STAGES.NPC_RETRY]: { color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)' },
  [STAGES.DISCOVERY]: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' },
  [STAGES.DEMO_SCHEDULED]: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  [STAGES.DEMO_DONE]: { color: '#2dd4bf', bg: 'rgba(45,212,191,0.1)', border: 'rgba(45,212,191,0.2)' },
  [STAGES.NEGOTIATION]: { color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.2)' },
  [STAGES.CONVERTED]: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' },
  [STAGES.LOST]: { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
};

// Next stage advancement
export const NEXT_STAGE = {
  [STAGES.FRESH_ENQUIRY]: STAGES.FIRST_CALL,
  [STAGES.FIRST_CALL]: STAGES.DISCOVERY,
  [STAGES.NPC_RETRY]: STAGES.DISCOVERY,
  [STAGES.DISCOVERY]: STAGES.DEMO_SCHEDULED,
  [STAGES.DEMO_SCHEDULED]: STAGES.DEMO_DONE,
  [STAGES.DEMO_DONE]: STAGES.NEGOTIATION,
  [STAGES.NEGOTIATION]: STAGES.CONVERTED,
};

// What the salesperson should DO at this stage
export const STAGE_ACTION = {
  [STAGES.FRESH_ENQUIRY]: { label: '📞 Make First Call', verb: 'Call' },
  [STAGES.FIRST_CALL]: { label: '🔍 Begin Discovery', verb: 'Qualify' },
  [STAGES.NPC_RETRY]: { label: '🔄 Retry Call + WhatsApp', verb: 'Retry' },
  [STAGES.DISCOVERY]: { label: '📅 Schedule Google Meet Demo', verb: 'Book Demo' },
  [STAGES.DEMO_SCHEDULED]: { label: '🖥️ Conduct Live Demo', verb: 'Demo' },
  [STAGES.DEMO_DONE]: { label: '💬 Start Negotiation', verb: 'Negotiate' },
  [STAGES.NEGOTIATION]: { label: '💰 Close the Deal!', verb: 'Close' },
  [STAGES.CONVERTED]: { label: '🎉 Client Onboarded', verb: 'Onboard' },
};

// Expected max days in each stage (for stagnation alerts)
export const STAGE_MAX_DAYS = {
  [STAGES.FRESH_ENQUIRY]: 1,
  [STAGES.FIRST_CALL]: 1,
  [STAGES.NPC_RETRY]: 3,
  [STAGES.DISCOVERY]: 3,
  [STAGES.DEMO_SCHEDULED]: 5,
  [STAGES.DEMO_DONE]: 3,
  [STAGES.NEGOTIATION]: 7,
};

// Win probability by stage (for revenue forecasting)
export const STAGE_WIN_PROB = {
  [STAGES.FRESH_ENQUIRY]: 5,
  [STAGES.FIRST_CALL]: 10,
  [STAGES.NPC_RETRY]: 8,
  [STAGES.DISCOVERY]: 25,
  [STAGES.DEMO_SCHEDULED]: 40,
  [STAGES.DEMO_DONE]: 60,
  [STAGES.NEGOTIATION]: 80,
  [STAGES.CONVERTED]: 100,
  [STAGES.LOST]: 0,
};

// ── WHATSAPP TEMPLATES (Stage-specific) ──

export const MESSAGE_TEMPLATES = {
  [STAGES.FRESH_ENQUIRY]: null, // First action = CALL, not WhatsApp

  [STAGES.FIRST_CALL]: {
    label: '📱 Send Intro Message',
    template: (name) =>
      `Hi ${name}! 👋\n\nThanks for your enquiry about our *ALGO Trading System*!\n\nI just tried calling you. I'm your product consultant and would love to walk you through how our platform works.\n\n✅ Fully automated strategies\n✅ Works with all major brokers\n✅ Real-time P&L tracking\n\nWhen is a good time to connect? 🎯`,
  },

  [STAGES.NPC_RETRY]: {
    label: '🔄 Send WhatsApp Follow-up',
    template: (name) =>
      `Hi ${name}! 👋 I've been trying to reach you regarding ALGO trading.\n\nI know you're busy, so here's a quick 2-min overview of what we offer:\n\n📈 *Automated trading strategies* — no manual monitoring\n🔒 *SEBI compliant* — your capital stays in your demat\n💰 Clients are seeing *15-25% monthly returns*\n\nJust reply "YES" and I'll send you a quick demo video! 🎥`,
  },

  [STAGES.DISCOVERY]: {
    label: '📊 Send Platform Overview',
    template: (name) =>
      `Hi ${name}! 👋 Great speaking with you!\n\nAs discussed, here's a quick overview of our *ALGO Trading Platform*:\n\n✅ Automate strategies — Straddle, Iron Condor & more\n✅ Works with Zerodha, Angel One, Upstox\n✅ Real-time P&L tracking\n\nWould you like to see a *LIVE demo* on Google Meet? It takes just 20 minutes! 📅\n\nI have slots available this week. What time works? 🎯`,
  },

  [STAGES.DEMO_SCHEDULED]: {
    label: '⏰ Send Demo Reminder',
    template: (name) =>
      `Hi ${name}! 👋\n\nJust a friendly reminder — your *LIVE algo trading demo* is scheduled!\n\n📅 Join here: [MEET_LINK]\n\nYou'll see:\n• Live strategy execution\n• Real P&L tracking\n• How to connect your broker\n\nSee you there! 🚀`,
  },

  [STAGES.DEMO_DONE]: {
    label: '📋 Send Demo Follow-up',
    template: (name) =>
      `Hi ${name}! Thanks for attending the demo! 🎉\n\nHope you found it helpful. As promised, here's the summary:\n\n📊 Our platform handles 50+ strategies across Options & Equity\n🔐 Zero manual intervention needed\n📱 Monitor via app + Telegram alerts\n\nReady to discuss which plan suits your trading style? Let's chat! 💬`,
  },

  [STAGES.NEGOTIATION]: {
    label: '💰 Send Pricing & Offer',
    template: (name) =>
      `Hi ${name}!\n\nBased on your capital and trading style, here's our plan:\n\n🎯 *Monthly Plan — ₹12,999/mo*\n\n🔥 *Special Offer:*\n→ Get *20% OFF* → ₹10,399/mo\n→ Or split into *2 easy payments* of ₹5,200\n\nThis offer is valid for 48 hours ⏰\n\nPayment Link: [LINK]\n\nLet's get you started! 🚀`,
  },

  [STAGES.CONVERTED]: {
    label: '🎉 Welcome Message',
    template: (name) =>
      `Welcome aboard, ${name}! 🎉🚀\n\nYour algo trading journey starts now!\n\n1️⃣ Login credentials → via email\n2️⃣ Connect your broker API (5 min setup)\n3️⃣ We'll set up your first strategy together\n\nI'll reach out shortly for your onboarding session. Exciting times ahead! 💪`,
  },
};

// ── PRICING & PAYMENT ──

export const PLAN_OPTIONS = [
  { value: 'monthly', label: 'Monthly Plan', price: 12999, desc: '₹12,999/mo' },
  { value: 'monthly_discount', label: 'Monthly (20% Off)', price: 10399, desc: '₹10,399/mo', badge: '🔥 POPULAR' },
  { value: 'split_2', label: '2-Part Payment', price: 12999, desc: '₹6,500 × 2', split: true, parts: 2, partAmount: 6500 },
  { value: 'custom', label: 'Custom Amount', price: 0, desc: 'Custom' },
];

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PART_1_PAID: 'part_1_paid',
  PART_2_PAID: 'part_2_paid',
  FULLY_PAID: 'fully_paid',
};

// ── LEAD TYPES ──

export const LEAD_TYPES = [
  { value: 'web_lead', label: 'Web Lead', icon: '🌐', desc: 'From ads & social media' },
  { value: 'mass_data', label: 'Mass Data', icon: '📋', desc: 'Cold calling / filtered data' },
  { value: 'referral', label: 'Referral', icon: '🤝', desc: 'Client referral' },
];

// ── LEAD SOURCES ──

export const LEAD_SOURCES = [
  { value: 'instagram_ads', label: 'Instagram Ads', icon: '📸' },
  { value: 'facebook_ads', label: 'Facebook Ads', icon: '📘' },
  { value: 'google_ads', label: 'Google Ads', icon: '🔍' },
  { value: 'youtube', label: 'YouTube', icon: '📺' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'telegram', label: 'Telegram', icon: '✈️' },
  { value: 'referral', label: 'Referral', icon: '🤝' },
  { value: 'website', label: 'Website', icon: '🌐' },
  { value: 'paid_data', label: 'Paid Data', icon: '📊' },
  { value: 'extra_data', label: 'Extra Data', icon: '📁' },
  { value: 'manual', label: 'Manual Entry', icon: '✍️' },
];

// ── AGE GROUPS ──

export const AGE_GROUPS = [
  { value: '18-25', label: '18-25 (Young Trader)' },
  { value: '25-35', label: '25-35 (Active Professional)' },
  { value: '35-50', label: '35-50 (Experienced Investor)' },
  { value: '50+', label: '50+ (Senior Investor)' },
];

// ── ALGO TRADING DOMAIN ──

export const BROKERS = [
  { value: 'zerodha', label: 'Zerodha' },
  { value: 'angel_one', label: 'Angel One' },
  { value: 'fyers', label: 'Fyers' },
  { value: 'upstox', label: 'Upstox' },
  { value: '5paisa', label: '5paisa' },
  { value: 'groww', label: 'Groww' },
  { value: 'dhan', label: 'Dhan' },
  { value: 'alice_blue', label: 'Alice Blue' },
  { value: 'kotak', label: 'Kotak' },
  { value: 'icici', label: 'ICICI Direct' },
  { value: 'hdfc', label: 'HDFC Securities' },
  { value: 'sbi', label: 'SBI' },
  { value: 'other', label: 'Other' },
];

export const TRADING_EXPERIENCE = [
  { value: 'beginner', label: 'Beginner (< 1 year)' },
  { value: 'intermediate', label: 'Intermediate (1-3 years)' },
  { value: 'advanced', label: 'Advanced (3+ years)' },
  { value: 'pro', label: 'Professional Trader' },
];

export const LOST_REASONS = [
  { value: 'too_expensive', label: 'Too Expensive' },
  { value: 'using_competitor', label: 'Using Competitor' },
  { value: 'not_ready', label: 'Not Ready Yet' },
  { value: 'no_response', label: 'No Response' },
  { value: 'technical_issues', label: 'Technical Concerns' },
  { value: 'trust_issues', label: 'Trust / SEBI Concerns' },
  { value: 'wrong_inquiry', label: 'Wrong Inquiry' },
  { value: 'low_capital', label: 'Low Capital' },
  { value: 'other', label: 'Other' },
];

export const QUICK_DISPOSITIONS = [
  { value: 'busy', label: 'BUSY', icon: '⏳' },
  { value: 'npc', label: 'NPC', icon: '👻' },
  { value: 'wrong_inquiry', label: 'WRONG', icon: '❌' },
  { value: 'no_whatsapp', label: 'NO WA', icon: '📵' },
  { value: 'not_interested', label: 'NOT INT.', icon: '🚫' },
  { value: 'call_back', label: 'CALLBACK', icon: '📞' },
  { value: 'already_using', label: 'HAS ALGO', icon: '🤖' },
  { value: 'unreachable', label: 'UNREACH', icon: '📡' },
];

export const COMPETITORS = [
  { value: 'tradetron', label: 'Tradetron' },
  { value: 'quantiply', label: 'Quantiply' },
  { value: 'algobaba', label: 'Algobaba' },
  { value: 'sensibull', label: 'Sensibull' },
  { value: 'streak', label: 'Streak (Zerodha)' },
  { value: 'algotest', label: 'AlgoTest' },
  { value: 'other_software', label: 'Other Software' },
  { value: 'advisory', label: 'Advisory Service' },
];

// ── MOOD TRACKER (after call) ──

export const CALL_MOODS = [
  { value: 'very_positive', label: 'Very Positive', emoji: '🤩', color: '#34d399' },
  { value: 'positive', label: 'Positive', emoji: '😊', color: '#10b981' },
  { value: 'neutral', label: 'Neutral', emoji: '😐', color: '#fbbf24' },
  { value: 'negative', label: 'Negative', emoji: '😕', color: '#fb923c' },
  { value: 'very_negative', label: 'Rejected', emoji: '😡', color: '#ef4444' },
];

// ── NAVIGATION PAGES ──

export const NAV_PAGES = [
  { id: 'home', label: 'Home', icon: 'Home', desc: 'Dashboard & KPIs' },
  { id: 'today', label: 'My Day', icon: 'Zap', desc: 'Guided call queue', badge: true },
  { id: 'pipeline', label: 'Pipeline', icon: 'Columns3', desc: 'Kanban board' },
  { id: 'clients', label: 'All Clients', icon: 'Users', desc: 'Client database' },
  { id: 'revenue', label: 'Revenue', icon: 'IndianRupee', desc: 'Revenue tracking' },
  { id: 'intelligence', label: 'AI Intel', icon: 'Brain', desc: 'AI insights', badge: true },
];

export const NAV_SECONDARY = [
  { id: 'leaderboard', label: 'Leaderboard', icon: 'Trophy' },
];

// ── GOOGLE CALENDAR LINK GENERATOR ──

export function generateGCalLink({ title, description, startDate, endDate, location }) {
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace('.000', '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Algo Trading Demo',
    details: description || 'Live demo of our ALGO trading platform',
    location: location || 'Google Meet',
    dates: `${fmt(startDate)}/${fmt(endDate || new Date(new Date(startDate).getTime() + 30 * 60000))}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ── OLD STAGE MAPPING (for migration) ──

export const OLD_TO_NEW_STAGE = {
  'new_signals': STAGES.FRESH_ENQUIRY,
  'discovery': STAGES.DISCOVERY,
  'system_demo': STAGES.DEMO_SCHEDULED,
  'checkout': STAGES.NEGOTIATION,
  'deployed': STAGES.CONVERTED,
  'lost': STAGES.LOST,
};

// ── GOOGLE SHEETS COLOR → STATUS MAPPING ──

export const SHEET_COLOR_MAP = {
  green: { status: STAGES.DISCOVERY, label: 'Done Enquiry (Trader)', hex: '#93c47d' },
  grey: { status: STAGES.LOST, label: 'Not Interested', hex: '#cccccc' },
  sky_blue: { status: STAGES.CONVERTED, label: 'Converted', hex: '#a4c2f4' },
  purple: { status: STAGES.DEMO_DONE, label: 'Google Meet / Long Call Done', hex: '#b4a7d6' },
  white: { status: STAGES.FRESH_ENQUIRY, label: 'Fresh / Untouched', hex: '#ffffff' },
};

// ── SHEET SYNC CONFIG ──

export const SHEET_SYNC = {
  SPREADSHEET_ID: '1QnB8S58UPFUxNg-nZl449l-zUlqV7d5qJ8C8ZPsuKQw',
  TABS: {
    WEB_LEAD: { name: 'Web Lead', gid: '550928916', leadType: 'web_lead' },
    FOLLOW_UP: { name: 'Follow up', gid: '1785169269', leadType: 'mass_data' },
  },
  COLUMNS: { SHORT_NOTE: 0, NAME: 1, PHONE: 2, CITY: 3, CAPITAL: 4, FEEDBACK: 5 },
  DAILY_TARGET: 3, // Minimum leads per rep per day by 10 AM IST
  DAILY_DEADLINE_HOUR: 10, // 10 AM IST
};
