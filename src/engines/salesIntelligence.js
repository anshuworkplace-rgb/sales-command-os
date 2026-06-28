/**
 * SALES INTELLIGENCE ENGINE
 * Real AI-level tracking: DRR, forecasting, alerts, productivity scoring
 * Designed for Indian office (IST), ₹1.5L avg monthly targets, 6-day week (Mon-Sat)
 */

import { parseHinglishFeedback } from './hinglishParser';

const DEFAULT_TARGET = 150000; // ₹1.5 Lakh
const WORKING_DAYS_PER_MONTH = 26; // 6-day week

// Helper to get true IST components regardless of local server/system timezone
export function getISTComponents() {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const c = {};
    parts.forEach(p => { c[p.type] = p.value; });
    
    return {
      year: parseInt(c.year, 10),
      month: parseInt(c.month, 10) - 1, // 0-indexed
      date: parseInt(c.day, 10),
      hour: parseInt(c.hour, 10),
      minute: parseInt(c.minute, 10),
      second: parseInt(c.second, 10)
    };
  } catch (e) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      date: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds()
    };
  }
}

// ── DAILY RUN RATE ──
export function calculateDRR(revenue, daysElapsed) {
  if (!daysElapsed || daysElapsed <= 0) return 0;
  return Math.round(revenue / daysElapsed);
}

export function requiredDRR(target, revenue, daysRemaining) {
  if (daysRemaining <= 0) return 0;
  const gap = Math.max(0, target - revenue);
  return Math.round(gap / daysRemaining);
}

// ── WIN PROBABILITY ──
export function calculateWinProbability(lead) {
  if (['deployed', 'converted'].includes(lead.status)) return 100;
  if (lead.status === 'lost') return 0;
  
  // Base probabilities by stage (9-stage pipeline)
  const baseProb = {
    fresh_enquiry: 5,
    first_call: 10,
    npc_retry: 8,
    discovery: 25,
    demo_scheduled: 40,
    demo_done: 60,
    negotiation: 80,
    // Legacy mappings
    new_signals: 10,
    system_demo: 60,
    checkout: 90,
  }[lead.status] || 10;

  // Time decay factor (longer in pipeline = lower probability)
  const daysInPipeline = (new Date() - new Date(lead.created_at)) / 86400000;
  let decay = 0;
  if (daysInPipeline > 7) decay = 5;
  if (daysInPipeline > 14) decay = 15;
  if (daysInPipeline > 30) decay = 30;

  // Overdue penalty
  if (lead.next_follow_up && new Date(lead.next_follow_up) < new Date()) {
    decay += 10;
  }

  // Experience boost
  let boost = 0;
  if (lead.trading_experience === 'expert' || lead.trading_experience === 'intermediate' || lead.trading_experience === 'advanced') boost += 10;
  if (lead.plan_interest === 'premium') boost += 5;

  return Math.max(5, Math.min(95, baseProb - decay + boost));
}

// ── MONTH PROGRESS (IST) ──
export function getMonthProgress(year = null, month = null) {
  const ist = getISTComponents();
  const targetYear = year !== null ? Number(year) : ist.year;
  const targetMonth = month !== null ? Number(month) : ist.month;
  
  const firstDay = new Date(targetYear, targetMonth, 1);
  const lastDay = new Date(targetYear, targetMonth + 1, 0);
  const totalDays = lastDay.getDate();
  
  const isCurrentMonth = (targetYear === ist.year && targetMonth === ist.month);
  const dayOfMonth = isCurrentMonth ? ist.date : totalDays;

  // Count working days (Mon-Sat = working in Indian offices)
  let workingDaysElapsed = 0, totalWorkingDays = 0;
  for (let d = 1; d <= totalDays; d++) {
    const day = new Date(Date.UTC(targetYear, targetMonth, d, 12, 0, 0)).getUTCDay();
    if (day !== 0) { // Sunday = off
      totalWorkingDays++;
      if (d <= dayOfMonth) workingDaysElapsed++;
    }
  }
  const workingDaysRemaining = totalWorkingDays - workingDaysElapsed;
  const monthPercent = Math.round((dayOfMonth / totalDays) * 100);
  const monthName = new Date(Date.UTC(targetYear, targetMonth, 1, 12, 0, 0)).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'long',
    year: 'numeric'
  });

  return { dayOfMonth, totalDays, workingDaysElapsed, workingDaysRemaining, totalWorkingDays, monthPercent, monthName, year: targetYear, month: targetMonth };
}

// ── OFFICE HOURS (IST 9:30 AM - 6:30 PM) ──
export function getOfficeStatus() {
  const ist = getISTComponents();
  const hours = ist.hour;
  const mins = ist.minute;
  const totalMins = hours * 60 + mins;
  const startMins = 9 * 60 + 30; // 9:30 AM
  const endMins = 18 * 60 + 30; // 6:30 PM
  
  const dayOfWeek = new Date(Date.UTC(ist.year, ist.month, ist.date, 12, 0, 0)).getUTCDay();
  const isOfficeHours = totalMins >= startMins && totalMins <= endMins && dayOfWeek !== 0;
  
  const minsLeft = isOfficeHours ? endMins - totalMins : 0;
  const hoursWorked = isOfficeHours ? ((totalMins - startMins) / 60).toFixed(1) : 0;
  const dayProgress = isOfficeHours ? Math.round(((totalMins - startMins) / (endMins - startMins)) * 100) : (totalMins > endMins ? 100 : 0);
  
  let period = hours >= 12 ? 'PM' : 'AM';
  let displayHour = hours % 12;
  displayHour = displayHour ? displayHour : 12;
  const displayMin = String(mins).padStart(2, '0');
  const currentTime = `${displayHour}:${displayMin} ${period}`;
  
  return { isOfficeHours, minsLeft, hoursWorked, dayProgress, currentTime };
}

// ── REP PERFORMANCE SCORE (0-100) + DISTINCTION LEVELS ──
export function calculateRepScore(rep, leads, monthlyTarget = null, year = null, month = null) {
  const ist = getISTComponents();
  const targetYear = year !== null ? Number(year) : ist.year;
  const targetMonth = month !== null ? Number(month) : ist.month;

  const repLeads = leads.filter(l => l.assigned_to === rep.id);

  // Filter leads that are relevant to this month (either created in it or won in it)
  const repLeadsThisMonth = repLeads.filter(l => {
    const cDate = new Date(l.created_at);
    const createdThisMonth = cDate.getFullYear() === targetYear && cDate.getMonth() === targetMonth;
    
    let wonThisMonth = false;
    if (['deployed', 'converted', 'closed_won'].includes(l.status)) {
      const uDate = new Date(l.updated_at || l.created_at);
      wonThisMonth = uDate.getFullYear() === targetYear && uDate.getMonth() === targetMonth;
    }
    
    return createdThisMonth || wonThisMonth;
  });

  const target = Number(monthlyTarget !== null ? monthlyTarget : (rep.monthly_target || DEFAULT_TARGET));

  // Revenue closed THIS MONTH
  const revenue = repLeadsThisMonth
    .filter(l => ['deployed', 'converted', 'closed_won'].includes(l.status))
    .reduce((s, l) => s + (Number(l.revenue) || 0), 0);

  // Converted count THIS MONTH
  const converted = repLeadsThisMonth.filter(l => {
    if (!['deployed', 'converted', 'closed_won'].includes(l.status)) return false;
    const uDate = new Date(l.updated_at || l.created_at);
    return uDate.getFullYear() === targetYear && uDate.getMonth() === targetMonth;
  }).length;

  // Total leads created THIS MONTH
  const total = repLeadsThisMonth.filter(l => {
    const cDate = new Date(l.created_at);
    return cDate.getFullYear() === targetYear && cDate.getMonth() === targetMonth;
  }).length;

  // Active leads (crosses months, so check all assigned active)
  const active = repLeads.filter(l => !['deployed', 'converted', 'closed_won', 'lost'].includes(l.status)).length;

  // Overdue followups (all assigned)
  const overdue = repLeads.filter(l => l.next_follow_up && new Date(l.next_follow_up) < new Date() && !['deployed', 'converted', 'closed_won', 'lost'].includes(l.status)).length;

  const progress = getMonthProgress(targetYear, targetMonth);
  const { workingDaysElapsed, workingDaysRemaining } = progress;

  let score = 0;
  // Revenue attainment (40 pts)
  const attainment = target > 0 ? revenue / target : 0;
  score += Math.min(40, attainment * 40);
  // Conversion rate (20 pts)
  const convRate = total > 0 ? converted / total : 0;
  score += Math.min(20, convRate * 200);
  // Pipeline health (20 pts) — penalize overdue
  score += Math.max(0, 20 - overdue * 5);
  // Activity (20 pts) — based on leads touched
  const activeTouched = repLeadsThisMonth.filter(l => !['deployed', 'closed_won', 'lost'].includes(l.status)).length;
  score += Math.min(20, activeTouched * 2);

  const finalScore = Math.round(Math.min(100, score));

  // ── DISTINCTION LEVELS ──
  let distinction = 'alert';
  let distinctionLabel = 'Needs Improvement';
  let distinctionEmoji = '⚠️';
  let distinctionColor = '#f87171';
  if (finalScore >= 90) {
    distinction = 'gold'; distinctionLabel = 'Gold Performer'; distinctionEmoji = '🥇'; distinctionColor = '#fbbf24';
  } else if (finalScore >= 70) {
    distinction = 'silver'; distinctionLabel = 'Silver Performer'; distinctionEmoji = '🥈'; distinctionColor = '#94a3b8';
  } else if (finalScore >= 50) {
    distinction = 'bronze'; distinctionLabel = 'Bronze'; distinctionEmoji = '🥉'; distinctionColor = '#d97706';
  }

  // ── DAILY LEAD INPUT COMPLIANCE (10 AM IST check) ──
  const isCurrentMonth = (targetYear === ist.year && targetMonth === ist.month);
  const todayStr = `${ist.year}-${String(ist.month + 1).padStart(2, '0')}-${String(ist.date).padStart(2, '0')}`;
  
  const todayLeads = repLeads.filter(l => {
    const d = new Date(l.created_at);
    // Parse in IST
    const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
    return datePart === todayStr;
  });
  const todayCount = todayLeads.length;
  const isDailyTargetMet = todayCount >= 3;

  // Check if submitted before 10 AM IST
  const tenAM = new Date();
  tenAM.setHours(10, 0, 0, 0); // 10 AM local/server, let's adjust for true 10 AM IST
  const earlySubmissions = todayLeads.filter(l => {
    const d = new Date(l.created_at);
    const hrs = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(d), 10);
    return hrs < 10;
  }).length;
  const isOnTimeToday = earlySubmissions >= 3 || ist.hour < 10;

  // ── SHEET SYNC STATS ──
  const sheetSynced = repLeadsThisMonth.filter(l => l.synced_from_sheet).length;
  const manualAdded = repLeadsThisMonth.filter(l => !l.synced_from_sheet).length;

  // ── COLOR DISTRIBUTION (from sheet colors) ──
  const colorDist = {
    fresh: repLeadsThisMonth.filter(l => l.status === 'fresh_enquiry').length,
    discovery: repLeadsThisMonth.filter(l => l.status === 'discovery').length,
    demo: repLeadsThisMonth.filter(l => ['demo_scheduled', 'demo_done'].includes(l.status)).length,
    converted: converted,
    lost: repLeadsThisMonth.filter(l => l.status === 'lost').length,
  };

  // ── STREAK (consecutive working days with >= 3 leads) ──
  let streak = 0;
  
  // Find lead entry counts per date for this rep in IST
  const leadsPerDate = {};
  repLeads.forEach(l => {
    const d = new Date(l.created_at);
    const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
    leadsPerDate[datePart] = (leadsPerDate[datePart] || 0) + 1;
  });

  if (isCurrentMonth) {
    if (todayCount >= 3) {
      streak = 1;
    }
    
    // Go backwards starting from yesterday
    const currentCheck = new Date();
    currentCheck.setDate(currentCheck.getDate() - 1);
    
    for (let i = 0; i < 30; i++) {
      // Skip Sundays
      if (currentCheck.getDay() === 0) {
        currentCheck.setDate(currentCheck.getDate() - 1);
        continue;
      }
      
      const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(currentCheck);
      const count = leadsPerDate[datePart] || 0;
      
      if (count >= 3) {
        streak++;
      } else {
        break; // streak broken
      }
      currentCheck.setDate(currentCheck.getDate() - 1);
    }
  } else {
    // Past months: start from last day of target month and go backwards
    const currentCheck = new Date(targetYear, targetMonth + 1, 0);
    for (let i = 0; i < 30; i++) {
      if (currentCheck.getMonth() !== targetMonth) break;
      
      // Skip Sundays
      if (currentCheck.getDay() === 0) {
        currentCheck.setDate(currentCheck.getDate() - 1);
        continue;
      }
      
      const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(currentCheck);
      const count = leadsPerDate[datePart] || 0;
      
      if (count >= 3) {
        streak++;
      } else {
        break; // streak broken
      }
      currentCheck.setDate(currentCheck.getDate() - 1);
    }
  }

  // ── AVERAGE LEADS PER DAY (this month) ──
  const avgLeadsPerDay = workingDaysElapsed > 0 ? (total / workingDaysElapsed).toFixed(1) : '0';

  return {
    score: finalScore,
    revenue, target, attainment: Math.round(attainment * 100),
    converted, total, overdue, active,
    drr: calculateDRR(revenue, workingDaysElapsed),
    requiredDrr: requiredDRR(target, revenue, workingDaysRemaining),
    convRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    distinction, distinctionLabel, distinctionEmoji, distinctionColor,
    todayCount, isDailyTargetMet, isOnTimeToday,
    sheetSynced, manualAdded,
    colorDist,
    streak,
    avgLeadsPerDay: parseFloat(avgLeadsPerDay),
  };
}

// ── AI INTELLIGENCE ALERTS ──
export function generateIntelligence(leads, users, getTargetFn = null) {
  const alerts = [];
  const { workingDaysElapsed, workingDaysRemaining, monthPercent } = getMonthProgress();
  const salesReps = users.filter(u => u.role === 'sales');

  salesReps.forEach(rep => {
    const customTarget = getTargetFn ? getTargetFn(rep.id) : null;
    const stats = calculateRepScore(rep, leads, customTarget);

    // Target at risk
    if (monthPercent > 50 && stats.attainment < 40) {
      alerts.push({ type: 'danger', icon: '🚨', rep: rep.name, title: `${rep.name} at HIGH RISK`, desc: `Only ${stats.attainment}% achieved. Needs ₹${((stats.target - stats.revenue) / 1000).toFixed(0)}K more. Manager Action: Shadow next 3 calls.`, priority: 100 });
    }
    // Overdue SLA
    if (stats.overdue >= 3) {
      alerts.push({ type: 'warning', icon: '⚠️', rep: rep.name, title: `${rep.name}: ${stats.overdue} overdue follow-ups`, desc: `Pipeline discipline breaking down. Manager Action: Enforce 1hr block for backlog clearance.`, priority: 80 });
    }
    // DRR falling behind
    if (stats.drr > 0 && stats.requiredDrr > stats.drr * 1.5) {
      alerts.push({ type: 'warning', icon: '📉', rep: rep.name, title: `${rep.name}: DRR gap widening`, desc: `Current DRR ₹${(stats.drr / 1000).toFixed(1)}K vs required ₹${(stats.requiredDrr / 1000).toFixed(1)}K/day`, priority: 70 });
    }
    // On fire
    if (stats.attainment >= 80 && monthPercent < 80) {
      alerts.push({ type: 'success', icon: '🔥', rep: rep.name, title: `${rep.name} is ON FIRE!`, desc: `${stats.attainment}% target achieved already. Projected to overachieve!`, priority: 50 });
    }
    // No pipeline
    if (stats.active === 0 && stats.attainment < 100) {
      alerts.push({ type: 'danger', icon: '🕳️', rep: rep.name, title: `${rep.name}: Empty pipeline!`, desc: `No active leads. Needs immediate lead assignment.`, priority: 90 });
    }
  });

  // Team-level
  const teamRev = leads
    .filter(l => ['deployed', 'converted', 'closed_won'].includes(l.status))
    .reduce((s, l) => s + (Number(l.revenue) || 0), 0);
  
  const teamTarget = salesReps.reduce((s, u) => {
    const customTarget = getTargetFn ? getTargetFn(u.id) : null;
    return s + Number(customTarget !== null ? customTarget : (u.monthly_target || DEFAULT_TARGET));
  }, 0);
  
  const teamDrr = calculateDRR(teamRev, workingDaysElapsed);
  const teamRequiredDrr = requiredDRR(teamTarget, teamRev, workingDaysRemaining);

  if (teamRequiredDrr > teamDrr * 2) {
    alerts.push({ type: 'danger', icon: '🎯', rep: 'Team', title: 'Team target severely at risk', desc: `Need ${((teamRequiredDrr / teamDrr) * 100 - 100).toFixed(0)}% DRR increase to hit target.`, priority: 95 });
  }

  return alerts.sort((a, b) => b.priority - a.priority);
}

// ── AI PRIORITY & GUIDANCE ENGINE ──
export function evaluateLeadPriority(lead) {
  const now = new Date();
  
  // Parse feedback via Hinglish parser (objections, dispositions, capital, experience)
  const feedback = parseHinglishFeedback(lead.notes || '', lead.follow_up_note || '');
  const disposition = lead.disposition || feedback.disposition?.key;
  const objections = feedback.objections || [];
  
  // Base stage flags
  const isFresh = ['new', 'fresh_enquiry'].includes(lead.status);
  const isHighIntent = ['demo_done', 'negotiation'].includes(lead.status);
  const isMidFunnel = ['first_call', 'discovery', 'demo_scheduled'].includes(lead.status);
  const isWon = ['converted', 'deployed', 'closed_won'].includes(lead.status);
  const isLost = lead.status === 'lost';
  
  // Terminal/archived lead feedback check (NPC, Not Interested, Wrong Inquiry)
  // These immediately drop the lead to lowest priority, even if they are in the 'fresh_enquiry' status
  if (disposition && ['npc', 'wrong_inquiry', 'not_interested'].includes(disposition)) {
    const displayDisp = disposition === 'npc' ? 'Not a Potential Client' : disposition.replace('_', ' ');
    return {
      score: 10,
      action: `Archive: Client marked as ${displayDisp}.`,
      tag: 'LOW',
      daysSinceEnquiry: lead.created_at ? Math.floor((now - new Date(lead.created_at)) / 86400000) : 0
    };
  }

  let score = 50; // base score
  let action = "Review Lead";
  
  // Parse enquiry date
  const enqRaw = lead.enquiry_date || lead.enquiryDate || lead.created_at;
  const enqDate = enqRaw ? new Date(enqRaw) : now;
  
  // Base stage value and actions
  if (isFresh) {
    // Untouched checking (no call count, no whatsapp count, no contact timestamp)
    const isUntouched = !lead.first_contact_at && (lead.call_count || 0) === 0 && (lead.wa_count || 0) === 0;
    if (isUntouched) {
      const diffMins = (now - enqDate) / 60000;
      if (diffMins <= 15) {
        score = 98; // High priority for brand new fresh untouched leads
        action = `⚡ NEW ENQUIRY: Touch immediately (SLA target <15m).`;
      } else {
        score = 100; // Peak priority for SLA breaches
        action = `🚨 SLA BREACH: Untouched fresh enquiry for ${Math.round(diffMins)}m! Call now.`;
      }
    } else {
      score = 80;
      action = "Qualification: Follow up on fresh enquiry.";
    }
  } else if (isHighIntent) {
    score = 75;
    action = "High intent phase. Push for closing proposal.";
  } else if (isMidFunnel) {
    score = 65;
    action = "Nurture lead. Set up demo or follow up.";
  } else if (isWon) {
    score = 10;
    action = "Deals won. Check system deployment.";
  } else if (isLost) {
    score = 5;
    action = "Deal lost. Mark notes for review.";
  } else {
    score = 50;
    action = "Standard follow-up.";
  }

  // Only apply active data & feedback boosts if the lead is active and not closed
  if (!isWon && !isLost) {
    // 1. Trader Profile Capital Factor (Data-driven)
    const capital = lead.capital_numeric || feedback.capital?.numeric || 0;
    if (capital >= 500000) {
      score += 15; // High capital tier boost
    } else if (capital >= 100000) {
      score += 10; // Mid capital tier boost
    } else if (capital >= 50000) {
      score += 5;  // Low capital tier boost
    }

    // 2. Trading Experience Factor (Data-driven)
    const exp = lead.trading_experience || feedback.experience?.[0]?.key;
    if (['option_trader', 'algo_user', 'pro', 'advanced'].includes(exp)) {
      score += 10; // High value experienced fit
    } else if (['intermediate', 'manual_trader'].includes(exp)) {
      score += 5;  // Medium value fit
    }

    // 3. Feedback Objection Prescriptive Actions (Feedback-driven)
    if (objections.length > 0) {
      score += 10; // Boost priority to address active customer concerns
      const primaryObjection = objections[0].key;
      if (primaryObjection === 'too_expensive') {
        action = "Address Budget: Offer Starter plan at ₹4,999/mo.";
      } else if (primaryObjection === 'had_losses') {
        action = "Address Losses: Pitch safe trading under client demat.";
      } else if (primaryObjection === 'trust_issues') {
        action = "Address Trust: Share SEBI registration & verified P&L.";
      } else if (primaryObjection === 'needs_proof') {
        action = "Provide Proof: Share backtests & live client profits.";
      } else if (primaryObjection === 'no_time') {
        action = "Address Time: Explain 100% automated algo execution.";
      }
    }

    // 4. Retry adjustments for Busy / Unreachable (Feedback-driven)
    if (disposition === 'busy' || disposition === 'unreachable') {
      score -= 15; // De-prioritize slightly to let reachable leads float up
      action = `Retry: Client was ${disposition.replace('_', ' ')}. Call at different slot.`;
    }

    // 5. Follow-up Recency & Urgency
    if (lead.next_follow_up) {
      const fDate = new Date(lead.next_follow_up);
      const diffHours = (now - fDate) / 3600000;
      
      if (diffHours > 0) {
        score += 25; // Overdue follow-up boost
        action = `🚨 OVERDUE [${Math.round(diffHours)}h]: ${action}`;
      } else if (Math.abs(diffHours) <= 24) {
        score += 15; // Scheduled for today boost
        action = `📅 TODAY: ${action}`;
      }
    }

    // 6. Inactivity Decay (Deduct points for inactivity, bypass for untouched fresh leads)
    const lastActiveRaw = lead.last_activity_at || enqRaw;
    if (lastActiveRaw) {
      const lastActiveDate = new Date(lastActiveRaw);
      const hoursInactive = (now - lastActiveDate) / 3600000;
      const isUntouchedFresh = isFresh && !lead.first_contact_at && (lead.call_count || 0) === 0 && (lead.wa_count || 0) === 0;
      
      if (hoursInactive > 24 && !isUntouchedFresh) {
        const decay = Math.min(15, Math.floor(hoursInactive - 24) * 2);
        score -= decay;
      }
    }
  }

  // Cap score between 0 and 100
  score = Math.min(100, Math.max(0, score));

  // Determine Tag based on score
  let tag = "NORMAL";
  if (score >= 90) {
    tag = "CRITICAL";
  } else if (score >= 75) {
    tag = "URGENT";
  } else if (score >= 60) {
    tag = "HIGH";
  } else if (score >= 40) {
    tag = "MEDIUM";
  } else if (score >= 15) {
    tag = "NORMAL";
  } else {
    tag = "LOW";
  }

  const todayDateOnly = new Date();
  todayDateOnly.setHours(0,0,0,0);
  const enqDateOnly = new Date(enqDate);
  enqDateOnly.setHours(0,0,0,0);
  const daysSinceEnquiry = Math.floor((todayDateOnly - enqDateOnly) / 86400000);

  return { score, action, tag, daysSinceEnquiry };
}

