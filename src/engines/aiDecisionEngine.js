/**
 * ═══════════════════════════════════════════════════════════════════
 * AI DECISION ENGINE — The Brain of Sales Command OS v2
 * ═══════════════════════════════════════════════════════════════════
 *
 * Unified intelligence layer that replaces 6+ scattered engine files.
 * Responsibilities:
 *   1. Lead Triage — classify every lead (REAL_TRADER / NEEDS_QUAL / NOT_INTERESTED / FRESH)
 *   2. Next Best Action (NBA) — exactly ONE recommended action per lead
 *   3. Priority Scoring — 0-100 urgency score driving the Command Feed order
 *   4. Follow-Up Intelligence — smart scheduling based on feedback parsing
 *   5. Gemini-powered deep analysis (with local fallback)
 */

import { parseHinglishFeedback } from './hinglishParser';
import { calculateHeatScore, getLeadAttentionSignal } from './leadIntelligence';
import { calculateWinProbability, evaluateLeadPriority } from './salesIntelligence';

// ── CONSTANTS ──────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ── TRIAGE CLASSIFICATIONS ─────────────────────────────────────

export const TRIAGE = {
  REAL_TRADER:        'real_trader',
  NEEDS_QUALIFICATION:'needs_qualification',
  NOT_INTERESTED:     'not_interested',
  FRESH_UNTOUCHED:    'fresh_untouched',
  PAID_CLIENT:        'paid_client',
  MEET_DONE:          'meet_done',
};

export const TRIAGE_META = {
  [TRIAGE.REAL_TRADER]:         { label: 'Real Trader',          color: '#22c55e', bgClass: 'triage-trader',     icon: '🟢' },
  [TRIAGE.NEEDS_QUALIFICATION]: { label: 'Needs Qualification',  color: '#f59e0b', bgClass: 'triage-qualify',    icon: '🟡' },
  [TRIAGE.NOT_INTERESTED]:      { label: 'Not Interested',       color: '#6b7280', bgClass: 'triage-cold',       icon: '⚫' },
  [TRIAGE.FRESH_UNTOUCHED]:     { label: 'Fresh Enquiry',        color: '#8b5cf6', bgClass: 'triage-fresh',      icon: '⚪' },
  [TRIAGE.PAID_CLIENT]:         { label: 'Paid Client',          color: '#3b82f6', bgClass: 'triage-paid',       icon: '🔵' },
  [TRIAGE.MEET_DONE]:           { label: 'Meet Done',            color: '#a855f7', bgClass: 'triage-meet',       icon: '🟣' },
};

// ── PRIORITY TAGS ──────────────────────────────────────────────

export const PRIORITY_TAGS = {
  CRITICAL: { label: 'CRITICAL', color: '#ef4444', weight: 100 },
  URGENT:   { label: 'URGENT',   color: '#f59e0b', weight: 75 },
  HIGH:     { label: 'HIGH',     color: '#3b82f6', weight: 50 },
  NORMAL:   { label: 'NORMAL',   color: '#6b7280', weight: 25 },
  LOW:      { label: 'LOW',      color: '#374151', weight: 10 },
};

// ── SHEET COLOR → TRIAGE MAPPING ───────────────────────────────
// Green shades = trader, Grey shades = not interested, Blue = paid, Purple = meet done

export const SHEET_COLOR_TO_TRIAGE = {
  // Green spectrum (trader)
  '#93c47d': TRIAGE.REAL_TRADER,     // Standard green
  '#6aa84f': TRIAGE.REAL_TRADER,     // Dark green (confirmed trader)
  '#b6d7a8': TRIAGE.REAL_TRADER,     // Light green (likely trader)
  '#d9ead3': TRIAGE.REAL_TRADER,     // Very light green
  '#38761d': TRIAGE.REAL_TRADER,     // Deep green (high conviction)

  // Grey spectrum (not interested)
  '#cccccc': TRIAGE.NOT_INTERESTED,  // Standard grey
  '#999999': TRIAGE.NOT_INTERESTED,  // Dark grey (confirmed not interested)
  '#d9d9d9': TRIAGE.NOT_INTERESTED,  // Light grey
  '#b7b7b7': TRIAGE.NOT_INTERESTED,  // Medium grey
  '#efefef': TRIAGE.NOT_INTERESTED,  // Very light grey

  // Blue spectrum (paid client)
  '#a4c2f4': TRIAGE.PAID_CLIENT,     // Sky blue
  '#6d9eeb': TRIAGE.PAID_CLIENT,     // Medium blue
  '#3c78d8': TRIAGE.PAID_CLIENT,     // Dark blue
  '#cfe2f3': TRIAGE.PAID_CLIENT,     // Light blue

  // Purple (meet done)
  '#b4a7d6': TRIAGE.MEET_DONE,      // Standard purple
  '#8e7cc3': TRIAGE.MEET_DONE,      // Dark purple
  '#d9d2e9': TRIAGE.MEET_DONE,      // Light purple

  // White (fresh)
  '#ffffff': TRIAGE.FRESH_UNTOUCHED,
};

// ══════════════════════════════════════════════════════════════════
// 1. LEAD TRIAGE — Classify each lead
// ══════════════════════════════════════════════════════════════════

export function classifyLead(lead) {
  // Priority 1: Sheet color mapping (most reliable — human-verified)
  if (lead.sheet_color && SHEET_COLOR_TO_TRIAGE[lead.sheet_color]) {
    return SHEET_COLOR_TO_TRIAGE[lead.sheet_color];
  }

  // Priority 2: Status-based classification
  if (['converted', 'deployed'].includes(lead.status)) return TRIAGE.PAID_CLIENT;
  if (lead.status === 'lost') return TRIAGE.NOT_INTERESTED;
  if (['demo_done'].includes(lead.status)) return TRIAGE.MEET_DONE;

  // Priority 3: Disposition-based
  if (['wrong_inquiry', 'not_interested', 'unreachable'].includes(lead.disposition)) {
    return TRIAGE.NOT_INTERESTED;
  }

  // Priority 4: Feedback sentiment
  if (lead.feedback_sentiment === 'negative') return TRIAGE.NOT_INTERESTED;
  if (lead.feedback_sentiment === 'positive') return TRIAGE.REAL_TRADER;

  // Priority 5: Stage-based inference
  if (['demo_scheduled', 'negotiation'].includes(lead.status)) return TRIAGE.REAL_TRADER;
  if (['discovery'].includes(lead.status)) return TRIAGE.REAL_TRADER;
  if (['first_call', 'npc_retry'].includes(lead.status)) return TRIAGE.NEEDS_QUALIFICATION;
  if (['fresh_enquiry', 'new'].includes(lead.status)) return TRIAGE.FRESH_UNTOUCHED;

  return TRIAGE.NEEDS_QUALIFICATION;
}

// ══════════════════════════════════════════════════════════════════
// 2. NEXT BEST ACTION — One recommended action per lead
// ══════════════════════════════════════════════════════════════════

const NBA_TEMPLATES = {
  fresh_enquiry: (lead) => ({
    action: 'call',
    label: 'Make first call',
    detail: `Fresh enquiry${lead.capital ? ` — ₹${lead.capital} capital` : ''}. Call within 15 min of enquiry.`,
    icon: '📞',
  }),
  first_call: (lead) => {
    if (lead.disposition === 'npc' || lead.disposition === 'busy') {
      return {
        action: 'retry',
        label: 'Retry call + WhatsApp',
        detail: `${lead.disposition === 'npc' ? 'Did not pick up' : 'Was busy'}. Try again and send WhatsApp intro.`,
        icon: '🔄',
      };
    }
    return {
      action: 'qualify',
      label: 'Begin discovery conversation',
      detail: 'First call done. Qualify their interest, capital, broker, and trading experience.',
      icon: '🔍',
    };
  },
  npc_retry: (lead) => ({
    action: 'retry',
    label: 'Retry call + WhatsApp follow-up',
    detail: `${lead.npc_count || 0} attempt(s) so far. Send WhatsApp if no answer.`,
    icon: '🔄',
  }),
  discovery: (lead) => ({
    action: 'schedule_meet',
    label: 'Schedule Google Meet demo',
    detail: `${lead.name} is qualified. Book a live demo session.`,
    icon: '📅',
  }),
  demo_scheduled: (lead) => ({
    action: 'remind',
    label: 'Send demo reminder',
    detail: 'Demo is scheduled. Send reminder 1 hour before the meeting.',
    icon: '⏰',
  }),
  demo_done: (lead) => ({
    action: 'negotiate',
    label: 'Start negotiation',
    detail: 'Demo completed. Follow up with pricing and special offer.',
    icon: '💬',
  }),
  negotiation: (lead) => ({
    action: 'close',
    label: 'Close the deal',
    detail: `${lead.name} is in negotiation. Push for payment with urgency.`,
    icon: '💰',
  }),
  converted: (lead) => ({
    action: 'onboard',
    label: 'Onboard client',
    detail: 'Client has paid. Send login credentials and schedule setup call.',
    icon: '🎉',
  }),
};

export function getNextBestAction(lead) {
  // Check overdue follow-up first — highest priority override
  if (lead.next_follow_up) {
    const followUp = new Date(lead.next_follow_up);
    const now = new Date();
    const hoursOverdue = (now - followUp) / 3600000;

    if (hoursOverdue > 0) {
      return {
        action: 'follow_up_overdue',
        label: `Follow up NOW — ${Math.floor(hoursOverdue)}h overdue`,
        detail: `Scheduled for ${followUp.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}. ${lead.follow_up_note || ''}`,
        icon: '🚨',
        isOverdue: true,
      };
    }
  }

  // Stage-specific NBA
  const template = NBA_TEMPLATES[lead.status];
  if (template) return template(lead);

  // Fallback
  return {
    action: 'follow_up',
    label: 'Follow up',
    detail: 'No specific action identified. Check lead status and take appropriate action.',
    icon: '📋',
  };
}

// ══════════════════════════════════════════════════════════════════
// 3. PRIORITY SCORING — 0-100 urgency driving Command Feed order
// ══════════════════════════════════════════════════════════════════

export function calculatePriorityScore(lead) {
  let score = 0;
  const now = Date.now();

  // ── Follow-up urgency (max +40) ──
  if (lead.next_follow_up) {
    const fu = new Date(lead.next_follow_up).getTime();
    const hoursUntil = (fu - now) / 3600000;

    if (hoursUntil < -24) score += 40;       // Overdue > 24h
    else if (hoursUntil < -4) score += 35;   // Overdue > 4h
    else if (hoursUntil < 0) score += 30;    // Overdue < 4h
    else if (hoursUntil < 1) score += 25;    // Due within 1h
    else if (hoursUntil < 4) score += 15;    // Due within 4h
    else if (hoursUntil < 24) score += 5;    // Due today
  } else {
    // No follow-up scheduled for active lead — bad
    if (!['converted', 'deployed', 'lost'].includes(lead.status)) {
      score += 20;
    }
  }

  // ── SLA violation for fresh leads (max +30) ──
  if (['fresh_enquiry', 'new'].includes(lead.status)) {
    const created = new Date(lead.enquiry_date || lead.created_at).getTime();
    const minSinceCreated = (now - created) / 60000;

    if (minSinceCreated > 60) score += 30;       // 1h+ untouched = critical
    else if (minSinceCreated > 30) score += 25;  // 30m+ untouched
    else if (minSinceCreated > 15) score += 20;  // SLA breach (15m)
    else score += 10;                             // Fresh but within SLA
  }

  // ── Capital factor (max +15) ──
  const cap = parseCapital(lead.capital);
  if (cap >= 1000000) score += 15;       // 10L+
  else if (cap >= 500000) score += 12;   // 5L+
  else if (cap >= 100000) score += 8;    // 1L+
  else if (cap >= 50000) score += 5;     // 50K+

  // ── Stage advancement opportunity (max +10) ──
  if (['negotiation', 'demo_done'].includes(lead.status)) score += 10;
  else if (['demo_scheduled'].includes(lead.status)) score += 7;
  else if (['discovery'].includes(lead.status)) score += 5;

  // ── Staleness penalty/boost (max +10) ──
  const lastActivity = new Date(lead.last_activity_at || lead.updated_at || lead.created_at).getTime();
  const hoursSince = (now - lastActivity) / 3600000;
  if (hoursSince > 72) score += 10;     // Going cold
  else if (hoursSince > 48) score += 5;
  else if (hoursSince < 2) score += 3;  // Recent activity = warm

  // ── Triage factor ──
  const triage = classifyLead(lead);
  if (triage === TRIAGE.REAL_TRADER) score += 5;
  if (triage === TRIAGE.NOT_INTERESTED) score -= 20;
  if (triage === TRIAGE.PAID_CLIENT) score -= 10; // Already converted

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getPriorityTag(score) {
  if (score >= 75) return PRIORITY_TAGS.CRITICAL;
  if (score >= 55) return PRIORITY_TAGS.URGENT;
  if (score >= 35) return PRIORITY_TAGS.HIGH;
  if (score >= 15) return PRIORITY_TAGS.NORMAL;
  return PRIORITY_TAGS.LOW;
}

// ══════════════════════════════════════════════════════════════════
// 4. FOLLOW-UP INTELLIGENCE — Smart scheduling from feedback
// ══════════════════════════════════════════════════════════════════

const FOLLOW_UP_PATTERNS = [
  { regex: /(?:kal|tomorrow|next\s*day)/i, days: 1, note: 'Said tomorrow' },
  { regex: /(?:2\s*din|2\s*days?|parso)/i, days: 2, note: 'Said in 2 days' },
  { regex: /(?:3\s*din|3\s*days?)/i, days: 3, note: 'Said in 3 days' },
  { regex: /(?:next\s*week|agle\s*week|hafte)/i, days: 7, note: 'Said next week' },
  { regex: /(?:month|mahine)/i, days: 30, note: 'Said next month' },
  { regex: /(?:busy|abhi\s*nahi|not\s*now)/i, days: 2, note: 'Was busy' },
  { regex: /(?:family|ghar|wife|husband|biwi|pati)/i, days: 3, note: 'Discussing with family' },
  { regex: /(?:travel|bahar|out\s*of\s*(?:town|station))/i, days: 5, note: 'Traveling' },
  { regex: /(?:salary|payment|paise\s*aane|funds?\s*(?:aa|come))/i, days: 7, note: 'Waiting for funds' },
  { regex: /(?:soch|think|consider|decide)/i, days: 3, note: 'Thinking about it' },
  { regex: /(?:call\s*back|callback|phir\s*call)/i, days: 1, note: 'Asked for callback' },
  { regex: /(?:whatsapp|wa\s*pe|message)/i, days: 1, note: 'Follow up on WhatsApp' },
  { regex: /(?:evening|shaam|raat)/i, days: 0.5, note: 'Call in evening' },
  { regex: /(?:morning|subah)/i, days: 0.5, note: 'Call in morning' },
];

// Default follow-up days by stage
const STAGE_DEFAULT_FOLLOWUP = {
  fresh_enquiry: 0,     // Immediate
  first_call: 1,        // Next day
  npc_retry: 1,         // Next day
  discovery: 2,         // 2 days
  demo_scheduled: 1,    // Day before demo
  demo_done: 1,         // Next day after demo
  negotiation: 2,       // Every 2 days
  converted: 7,         // Weekly check-in
};

export function inferFollowUpFromFeedback(feedbackText, stage) {
  if (!feedbackText) {
    const defaultDays = STAGE_DEFAULT_FOLLOWUP[stage] ?? 1;
    const date = new Date();
    date.setDate(date.getDate() + defaultDays);
    date.setHours(10, 0, 0, 0); // Default 10 AM IST
    return { date: date.toISOString(), note: 'Auto-scheduled based on stage', confidence: 'low' };
  }

  const text = feedbackText.toLowerCase();

  for (const pattern of FOLLOW_UP_PATTERNS) {
    if (pattern.regex.test(text)) {
      const date = new Date();
      if (pattern.days < 1) {
        // Same day, later time
        date.setHours(date.getHours() + Math.round(pattern.days * 24));
      } else {
        date.setDate(date.getDate() + pattern.days);
        date.setHours(10, 0, 0, 0); // 10 AM IST
      }
      return { date: date.toISOString(), note: pattern.note, confidence: 'high' };
    }
  }

  // Fallback to stage defaults
  const defaultDays = STAGE_DEFAULT_FOLLOWUP[stage] ?? 1;
  const date = new Date();
  date.setDate(date.getDate() + defaultDays);
  date.setHours(10, 0, 0, 0);
  return { date: date.toISOString(), note: 'Auto-scheduled', confidence: 'medium' };
}

// ══════════════════════════════════════════════════════════════════
// 5. PRIORITY QUEUE — Sorted list for Command Feed
// ══════════════════════════════════════════════════════════════════

export function buildPriorityQueue(leads, userId = null) {
  let queue = leads.filter(l => !['lost'].includes(l.status));

  // Filter by user if specified
  if (userId) {
    queue = queue.filter(l => l.assigned_to === userId);
  }

  // Enrich each lead with AI data
  return queue
    .map(lead => {
      const triage = classifyLead(lead);
      const priorityScore = calculatePriorityScore(lead);
      const priorityTag = getPriorityTag(priorityScore);
      const nba = getNextBestAction(lead);
      const heatScore = calculateHeatScore(lead);

      return {
        ...lead,
        _ai: {
          triage,
          triageMeta: TRIAGE_META[triage],
          priorityScore,
          priorityTag,
          nba,
          heatScore,
        },
      };
    })
    .sort((a, b) => b._ai.priorityScore - a._ai.priorityScore);
}

// ══════════════════════════════════════════════════════════════════
// 6. GEMINI-POWERED DEEP ANALYSIS
// ══════════════════════════════════════════════════════════════════

export async function getGeminiInsight(lead, context = '') {
  if (!GEMINI_API_KEY) return null;

  const prompt = `You are a sales intelligence AI for an algo trading platform in India.
Analyze this lead and provide actionable guidance in JSON format.

Lead Data:
- Name: ${lead.name}
- Phone: ${lead.phone}
- Capital: ${lead.capital || 'Unknown'}
- City: ${lead.city || 'Unknown'}
- Broker: ${lead.broker || 'Unknown'}
- Stage: ${lead.status}
- Trading Experience: ${lead.trading_experience || 'Unknown'}
- Last Feedback: ${lead.notes || lead.last_feedback || 'None'}
- Follow-up Note: ${lead.follow_up_note || 'None'}
- Days in current stage: ${Math.floor((Date.now() - new Date(lead.updated_at || lead.created_at).getTime()) / 86400000)}
${context ? `\nAdditional Context: ${context}` : ''}

Return JSON with:
{
  "conviction": "high|medium|low",
  "reasoning": "1-2 sentence explanation",
  "suggestedAction": "specific action to take",
  "talkingPoints": ["point 1", "point 2", "point 3"],
  "objectionHandling": "if any objections detected, how to handle",
  "followUpTiming": "when to follow up and why",
  "riskLevel": "high|medium|low"
}`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.warn('[AI Engine] Gemini analysis failed:', err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// 7. FOLLOW-UP REMINDER CHECKER
// ══════════════════════════════════════════════════════════════════

export function checkReminders(leads, userId) {
  const now = new Date();
  const reminders = [];

  const myLeads = userId ? leads.filter(l => l.assigned_to === userId) : leads;

  for (const lead of myLeads) {
    if (['lost', 'converted', 'deployed'].includes(lead.status)) continue;

    // 1. Overdue follow-ups
    if (lead.next_follow_up) {
      const fu = new Date(lead.next_follow_up);
      const minutesOverdue = (now - fu) / 60000;

      if (minutesOverdue > 0 && minutesOverdue < 1440) { // Overdue but < 24h
        reminders.push({
          type: 'overdue',
          severity: minutesOverdue > 240 ? 'critical' : 'warning',
          lead,
          title: `Overdue: ${lead.name || lead.phone}`,
          body: `Follow-up was ${Math.floor(minutesOverdue / 60)}h ${Math.floor(minutesOverdue % 60)}m ago`,
          action: getNextBestAction(lead),
        });
      }
    }

    // 2. SLA violations (fresh enquiry > 15 min untouched)
    if (['fresh_enquiry', 'new'].includes(lead.status)) {
      const created = new Date(lead.enquiry_date || lead.created_at);
      const minutesSince = (now - created) / 60000;

      if (minutesSince > 15 && !lead.first_contact_at) {
        reminders.push({
          type: 'sla',
          severity: minutesSince > 60 ? 'critical' : 'warning',
          lead,
          title: `SLA: ${lead.name || lead.phone}`,
          body: `Fresh enquiry untouched for ${Math.floor(minutesSince)} min`,
          action: { action: 'call', label: 'Call immediately', icon: '📞' },
        });
      }
    }
  }

  return reminders.sort((a, b) => {
    const sev = { critical: 2, warning: 1 };
    return (sev[b.severity] || 0) - (sev[a.severity] || 0);
  });
}

// ── Utility ────────────────────────────────────────────────────

function parseCapital(str) {
  if (!str) return 0;
  const t = String(str).toLowerCase().trim();
  const cr = t.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore)/i);
  if (cr) return parseFloat(cr[1]) * 10000000;
  const lakh = t.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l)\b/i);
  if (lakh) return parseFloat(lakh[1]) * 100000;
  const k = t.match(/(\d+(?:\.\d+)?)\s*k/i);
  if (k) return parseFloat(k[1]) * 1000;
  const num = t.match(/(\d+)/);
  if (num && parseInt(num[1]) >= 1000) return parseInt(num[1]);
  return 0;
}
