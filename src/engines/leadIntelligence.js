/**
 * LEAD INTELLIGENCE ENGINE
 * The internal AI brain of Sales Command OS.
 * Proactively identifies which leads need attention, which can become
 * potential clients, and which are missing follow-ups.
 */

import { detectCapital, detectCompetitors, detectObjections } from './hinglishParser';

// ══════════════════════════════════════════════════════
// LEAD SCORING — Calculates a 0-100 "heat score"
// ══════════════════════════════════════════════════════

export function calculateHeatScore(lead) {
  let score = 30; // base

  // Capital factor (higher capital = hotter lead)
  const cap = parseCapitalToNumber(lead.capital);
  if (cap >= 10000000) score += 25;       // 1 Cr+
  else if (cap >= 500000) score += 20;    // 5 Lakh+
  else if (cap >= 100000) score += 15;    // 1 Lakh+
  else if (cap >= 50000) score += 10;     // 50K+
  else if (cap >= 25000) score += 5;      // 25K+

  // Stage progression bonus
  const stageScore = {
    'fresh_enquiry': 0,
    'first_call': 5,
    'npc_retry': 3,
    'discovery': 10,
    'demo_scheduled': 20,
    'demo_done': 30,
    'negotiation': 40,
    'converted': 50,
  };
  score += stageScore[lead.status] || 0;

  // Activity recency (recent activity = higher score)
  const lastActivity = new Date(lead.last_activity_at || lead.updated_at || lead.created_at);
  const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / 3600000;
  if (hoursSinceActivity < 2) score += 10;
  else if (hoursSinceActivity < 12) score += 5;
  else if (hoursSinceActivity > 72) score -= 15;
  else if (hoursSinceActivity > 48) score -= 10;

  // Follow-up compliance
  if (lead.next_follow_up) {
    const followUp = new Date(lead.next_follow_up);
    if (followUp < new Date()) {
      // Overdue — penalize
      const hoursOverdue = (Date.now() - followUp.getTime()) / 3600000;
      score -= Math.min(20, hoursOverdue * 2);
    }
  }

  // Competitor detection penalty/opportunity
  if (lead.competitor) score += 5; // They're already in the market = potential

  // Revenue boost
  if (Number(lead.revenue) > 0) score += 15;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function parseCapitalToNumber(capitalStr) {
  if (!capitalStr) return 0;
  const t = capitalStr.toLowerCase().trim();
  const crMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore)/i);
  if (crMatch) return parseFloat(crMatch[1]) * 10000000;
  const lakhMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)/i);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;
  const kMatch = t.match(/(\d+(?:\.\d+)?)\s*k/i);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;
  const numMatch = t.match(/(\d+)/);
  if (numMatch && parseInt(numMatch[1]) >= 1000) return parseInt(numMatch[1]);
  return 0;
}

// ══════════════════════════════════════════════════════
// AI INTELLIGENCE SIGNALS
// Generates proactive alerts and recommendations
// ══════════════════════════════════════════════════════

export function generateLeadIntelligence(leads, users) {
  const now = new Date();
  const signals = [];

  // ─── 1. MISSING FOLLOW-UPS ───
  const missingFollowUp = leads.filter(l => {
    if (['deployed', 'lost'].includes(l.status)) return false;
    if (!l.next_follow_up) return true; // No follow-up scheduled at all
    return false;
  });

  if (missingFollowUp.length > 0) {
    signals.push({
      type: 'danger',
      category: 'missing_followup',
      icon: '🚨',
      title: `${missingFollowUp.length} leads have NO follow-up scheduled`,
      description: `These leads are drifting without a next action. Assign follow-ups immediately.`,
      leads: missingFollowUp.slice(0, 5).map(l => ({ id: l.id, name: l.name, phone: l.phone, assignee: l.assigned_to })),
      priority: 100,
    });
  }

  // ─── 2. OVERDUE FOLLOW-UPS ───
  const overdue = leads.filter(l => {
    if (['deployed', 'lost'].includes(l.status)) return false;
    return l.next_follow_up && new Date(l.next_follow_up) < now;
  });

  if (overdue.length > 0) {
    // Group by rep
    const byRep = {};
    overdue.forEach(l => {
      const repId = l.assigned_to;
      if (!byRep[repId]) byRep[repId] = [];
      byRep[repId].push(l);
    });

    Object.entries(byRep).forEach(([repId, repLeads]) => {
      const rep = users.find(u => u.id === repId);
      signals.push({
        type: 'warning',
        category: 'overdue',
        icon: '⏰',
        title: `${rep?.name || 'Unknown'}: ${repLeads.length} overdue follow-ups`,
        description: `${repLeads.map(l => l.name || l.phone).slice(0, 3).join(', ')}${repLeads.length > 3 ? ` +${repLeads.length - 3} more` : ''}`,
        leads: repLeads.slice(0, 5).map(l => ({ id: l.id, name: l.name, phone: l.phone })),
        repId,
        priority: 90,
      });
    });
  }

  // ─── 3. HIGH-POTENTIAL LEADS (should get attention) ───
  const highPotential = leads.filter(l => {
    if (['deployed', 'lost'].includes(l.status)) return false;
    const cap = parseCapitalToNumber(l.capital);
    return cap >= 100000; // 1 Lakh+ capital
  }).sort((a, b) => parseCapitalToNumber(b.capital) - parseCapitalToNumber(a.capital));

  if (highPotential.length > 0) {
    const stagnant = highPotential.filter(l => {
      const lastActivity = new Date(l.last_activity_at || l.created_at);
      return (now - lastActivity) > 48 * 3600000; // No activity in 48h
    });

    if (stagnant.length > 0) {
      signals.push({
        type: 'danger',
        category: 'high_value_stagnant',
        icon: '💎',
        title: `${stagnant.length} high-capital leads going cold!`,
        description: `Leads with ₹1L+ capital have had no activity in 48+ hours. Prioritize these NOW.`,
        leads: stagnant.slice(0, 5).map(l => ({
          id: l.id, name: l.name, phone: l.phone,
          capital: l.capital, status: l.status
        })),
        priority: 95,
      });
    }
  }

  // ─── 4. READY TO CONVERT (leads in negotiation/demo stage) ───
  const readyToConvert = leads.filter(l =>
    ['demo_done', 'negotiation'].includes(l.status)
  );

  if (readyToConvert.length > 0) {
    signals.push({
      type: 'success',
      category: 'ready_to_convert',
      icon: '🎯',
      title: `${readyToConvert.length} leads are close to conversion!`,
      description: `These leads are in Demo/Checkout stage. Push hard to close them this week.`,
      leads: readyToConvert.map(l => ({
        id: l.id, name: l.name, phone: l.phone,
        capital: l.capital, status: l.status
      })),
      priority: 70,
    });
  }

  // ─── 5. STALE LEADS (no activity in 72h+) ───
  const stale = leads.filter(l => {
    if (['deployed', 'lost'].includes(l.status)) return false;
    const lastActivity = new Date(l.last_activity_at || l.created_at);
    return (now - lastActivity) > 72 * 3600000;
  });

  if (stale.length > 5) {
    signals.push({
      type: 'warning',
      category: 'stale_pipeline',
      icon: '🕳️',
      title: `${stale.length} leads are going stale`,
      description: `No activity in 3+ days. These leads are at risk of being lost forever.`,
      leads: stale.slice(0, 5).map(l => ({ id: l.id, name: l.name, phone: l.phone })),
      priority: 60,
    });
  }

  // ─── 6. WEB LEADS VS MASS DATA PERFORMANCE ───
  const webLeads = leads.filter(l => l.lead_type === 'web_lead');
  const massLeads = leads.filter(l => l.lead_type === 'mass_data');
  const webConverted = webLeads.filter(l => l.status === 'deployed').length;
  const massConverted = massLeads.filter(l => l.status === 'deployed').length;
  const webConvRate = webLeads.length > 0 ? (webConverted / webLeads.length * 100) : 0;
  const massConvRate = massLeads.length > 0 ? (massConverted / massLeads.length * 100) : 0;

  if (webLeads.length > 5 && massLeads.length > 5) {
    signals.push({
      type: 'info',
      category: 'channel_insight',
      icon: '📊',
      title: `Channel Performance: Web ${webConvRate.toFixed(0)}% vs Mass ${massConvRate.toFixed(0)}%`,
      description: `Web Leads: ${webConverted}/${webLeads.length} converted. Mass Data: ${massConverted}/${massLeads.length} converted.`,
      priority: 30,
    });
  }

  // ─── 7. NEW LEADS NEEDING FIRST CONTACT ───
  const untouched = leads.filter(l => {
    if (l.status !== 'fresh_enquiry') return false;
    const age = (now - new Date(l.created_at)) / 3600000;
    return age > 1; // More than 1 hour old and still in fresh_enquiry
  });

  if (untouched.length > 0) {
    signals.push({
      type: 'danger',
      category: 'untouched',
      icon: '🔥',
      title: `${untouched.length} new leads haven't been contacted yet!`,
      description: `Fresh enquiries losing heat. Response time is critical for conversion.`,
      leads: untouched.slice(0, 5).map(l => ({ id: l.id, name: l.name, phone: l.phone, assignee: l.assigned_to })),
      priority: 85,
    });
  }

  // ─── 8. REP PERFORMANCE ALERTS ───
  const salesReps = users.filter(u => u.role === 'sales');
  salesReps.forEach(rep => {
    const repLeads = leads.filter(l => l.assigned_to === rep.id);
    const repActive = repLeads.filter(l => !['deployed', 'lost'].includes(l.status));
    const repOverdue = repActive.filter(l => l.next_follow_up && new Date(l.next_follow_up) < now);
    const overduePercent = repActive.length > 0 ? (repOverdue.length / repActive.length * 100) : 0;

    if (overduePercent > 50 && repOverdue.length >= 3) {
      signals.push({
        type: 'danger',
        category: 'rep_discipline',
        icon: '⚠️',
        title: `${rep.name}: ${overduePercent.toFixed(0)}% of pipeline is overdue`,
        description: `${repOverdue.length} of ${repActive.length} active leads have missed follow-ups. Needs coaching.`,
        repId: rep.id,
        priority: 80,
      });
    }
  });

  return signals.sort((a, b) => b.priority - a.priority);
}

// ══════════════════════════════════════════════════════
// LEAD ATTENTION SCORE
// Returns a per-lead attention signal
// ══════════════════════════════════════════════════════

export function getLeadAttentionSignal(lead) {
  const now = new Date();

  // Check if overdue
  if (lead.next_follow_up && new Date(lead.next_follow_up) < now) {
    const hoursOverdue = (now - new Date(lead.next_follow_up)) / 3600000;
    if (hoursOverdue > 24) {
      return { level: 'critical', label: `Overdue by ${Math.round(hoursOverdue / 24)}d`, color: 'red' };
    }
    return { level: 'warning', label: `Overdue by ${Math.round(hoursOverdue)}h`, color: 'amber' };
  }

  // Check if no follow-up scheduled
  if (!lead.next_follow_up && !['deployed', 'lost'].includes(lead.status)) {
    return { level: 'danger', label: 'No follow-up set!', color: 'red' };
  }

  // Check if high capital but stagnant
  const cap = parseCapitalToNumber(lead.capital);
  if (cap >= 100000) {
    const lastActivity = new Date(lead.last_activity_at || lead.created_at);
    const hoursSince = (now - lastActivity) / 3600000;
    if (hoursSince > 24) {
      return { level: 'warning', label: `High-value lead inactive ${Math.round(hoursSince / 24)}d`, color: 'amber' };
    }
  }

  // Check if due today
  if (lead.next_follow_up) {
    const followUp = new Date(lead.next_follow_up);
    if (followUp.toDateString() === now.toDateString()) {
      const hoursUntil = (followUp - now) / 3600000;
      if (hoursUntil <= 1 && hoursUntil > 0) {
        return { level: 'info', label: 'Due in < 1h', color: 'cyan' };
      }
      return { level: 'info', label: 'Due today', color: 'sky' };
    }
  }

  return null; // No attention signal
}

// ══════════════════════════════════════════════════════
// POTENTIAL CLIENT DETECTOR
// Identifies leads most likely to convert
// ══════════════════════════════════════════════════════

export function identifyPotentialClients(leads) {
  return leads
    .filter(l => !['deployed', 'lost'].includes(l.status))
    .map(l => ({
      ...l,
      heatScore: calculateHeatScore(l),
      potentialSignals: getPotentialSignals(l),
    }))
    .filter(l => l.heatScore >= 60)
    .sort((a, b) => b.heatScore - a.heatScore);
}

function getPotentialSignals(lead) {
  const signals = [];
  const cap = parseCapitalToNumber(lead.capital);

  if (cap >= 100000) signals.push('💰 High capital');
  if (['demo_done', 'negotiation'].includes(lead.status)) signals.push('🎯 Near conversion');
  if (lead.competitor) signals.push('🔄 Already in algo market');

  // Check notes for positive indicators
  const notes = (lead.notes || '').toLowerCase();
  if (/interest|interested|want|chahiye|chahte/i.test(notes)) signals.push('✅ Showed interest');
  if (/demo|meeting|gmeet|meet/i.test(notes)) signals.push('📅 Demo/meeting discussed');
  if (/details\s*(?:bhej|send|share)/i.test(notes)) signals.push('📄 Asked for details');

  return signals;
}
