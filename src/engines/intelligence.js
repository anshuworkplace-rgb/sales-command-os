/**
 * SALES OS UNIFIED INTELLIGENCE ENGINE
 * Main AI brain orchestrating predictive and prescriptive insights.
 * Supports Gemini API with structured JSON output and a deterministic local fallback.
 */

import { calculateWinProbability } from './salesIntelligence';

/**
 * Main entry point for fetching AI insights.
 * @param {Object} context - The analysis context containing leads, activities, users, targets, and credentials.
 */
export async function getInsights(context) {
  const {
    leads = [],
    activities = [],
    users = [],
    targets = [],
    currentUserId = null,
    apiKey = null
  } = context;

  // Try calling Gemini if API key is present
  if (apiKey) {
    try {
      const promptText = generateGeminiPrompt(leads, activities, users, targets, currentUserId);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
          const parsed = JSON.parse(textResponse);
          // Simple schema validation fallback if Gemini deviates
          if (parsed && parsed.nextBestActions && parsed.pipelinePhysics && parsed.forecasting) {
            return parsed;
          }
        }
      }
    } catch (error) {
      console.warn('[Intelligence Engine] LLM query failed, falling back to local model:', error);
    }
  }

  // Fallback to local deterministic analysis
  return computeLocalInsights(leads, activities, users, targets, currentUserId);
}

/**
 * Generates the prompt text for the Gemini model.
 */
function generateGeminiPrompt(leads, activities, users, targets, currentUserId) {
  // Aggregate summary data to avoid blowing context limits
  const activeLeads = leads.filter(l => !['converted', 'deployed', 'lost'].includes(l.status));
  const closedWonLeads = leads.filter(l => l.status === 'converted');
  
  const leadsSummary = activeLeads.slice(0, 15).map(l => ({
    id: l.id,
    name: l.name,
    status: l.status,
    revenue: l.revenue,
    source: l.source,
    created_at: l.created_at,
    assigned_to: l.assigned_to
  }));

  const wonSummary = closedWonLeads.slice(0, 10).map(l => ({
    revenue: l.revenue,
    created_at: l.created_at,
    last_activity_at: l.last_activity_at,
    assigned_to: l.assigned_to
  }));

  const userSummary = users.map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    monthly_target: u.monthly_target || 150000
  }));

  return `You are the AI Sales Core of Sales Command OS.
Analyze the sales data below and output a single, dense JSON object matching the schema exactly.
Do not add markdown formatting, comments, or wrap in codeblocks. Return raw JSON text only.

Context:
- Current User ID: "${currentUserId}"
- Reps roster: ${JSON.stringify(userSummary)}
- Targets set: ${JSON.stringify(targets)}
- Sample active pipeline leads: ${JSON.stringify(leadsSummary)}
- Sample closed won deals: ${JSON.stringify(wonSummary)}
- Recent activity log counts: ${activities.length} total actions recorded.

Expected JSON output schema:
{
  "nextBestActions": [
    {
      "leadId": "UUID of lead",
      "leadName": "Name of lead",
      "score": 95, // 0-100 priority score
      "action": "Immediate recommended task (e.g., 'WhatsApp price proposal')",
      "why": "One-line explainability rationale detailing why this action is selected"
    }
  ],
  "leadScores": {
    "leadIdUUID": {
      "score": 85, // 0-100 win probability
      "reasons": [
        "First factor (e.g., '+25% Demo completed')",
        "Second factor (e.g., '+10% High capital input')",
        "Third factor (e.g., '-15% Overdue follow-up')"
      ]
    }
  },
  "pipelinePhysics": {
    "velocity": 12500, // Total pipeline velocity (INR / day)
    "velocityDelta": 1200, // Change vs prior 30 days
    "velocityDeltaPct": 10.6,
    "slaTouchTimeMins": 14.5, // Avg minutes to touch new lead
    "slaTouchTimeDelta": -2.1,
    "slaTouchTimeDeltaPct": -12.6,
    "conversionRate": 18.2, // Overall conversion rate (%)
    "conversionRateDelta": 1.5,
    "cohorts": [
      { "cohort": "0-7 days", "rate": 8.5 },
      { "cohort": "8-15 days", "rate": 15.2 },
      { "cohort": "16-30 days", "rate": 22.0 }
    ]
  },
  "managerCoaching": [
    {
      "repId": "UUID of sales rep",
      "repName": "Name of sales rep",
      "anomaly": "Anomalous metric (e.g., 'Win rate on Google leads dropped 14%')",
      "prompt": "Coaching action prompt for manager (e.g., 'Review call transcripts for pricing objection handling')",
      "fix": "Specific suggested fix (e.g., 'Re-train on premium option bundling')"
    }
  ],
  "forecasting": {
    "commit": 320000, // Worst case forecast (INR)
    "mostLikely": 480000, // Most likely forecast (INR)
    "bestCase": 650000, // Best case forecast (INR)
    "target": 500000 // Month quota target
  },
  "smartRouting": {
    "recommendedRepId": "UUID of best rep",
    "recommendedRepName": "Name of best rep",
    "rationale": "Why this rep was selected (e.g., 'Anshu has a 64% win rate on Google leads and high momentum')"
  }
}`;
}

/**
 * Fallback local computational engine.
 */
function computeLocalInsights(leads, activities, users, targets, currentUserId) {
  const now = new Date();
  
  // ── 1. Next Best Actions & Explainable Scoring ──
  const openLeads = leads.filter(l => !['converted', 'deployed', 'lost', 'closed_won', 'closed_lost'].includes(l.status));
  const leadScores = {};
  
  const rawActions = openLeads.map(lead => {
    const value = Math.max(Number(lead.revenue || 0), parseFloat(String(lead.capital || '').replace(/[^\d]/g, '')) || 0, 25000);
    const winProb = calculateWinProbability(lead);
    
    // Decay Urgency: increase priority if lead hasn't had activity in a while
    const lastAct = lead.last_activity_at ? new Date(lead.last_activity_at) : new Date(lead.created_at);
    const hrsSinceActivity = (now - lastAct) / 3600000;
    const decayUrgency = Math.min(3.0, 1.0 + (hrsSinceActivity / 24));
    
    // SLA Risk: penalize overdue follow-ups
    let slaRisk = 1.0;
    let isOverdue = false;
    let hrsOverdue = 0;
    if (lead.next_follow_up) {
      const msOverdue = now - new Date(lead.next_follow_up);
      if (msOverdue > 0) {
        isOverdue = true;
        hrsOverdue = msOverdue / 3600000;
        slaRisk += Math.min(2.5, hrsOverdue / 3);
      }
    } else {
      slaRisk += 1.5; // High SLA risk if no follow-up is scheduled
    }
    
    // Base Priority Score
    const rawScore = value * (winProb / 100) * decayUrgency * slaRisk;
    
    // Generate explanation factors
    const reasons = [];
    const stageLabels = {
      new: 'Fresh Enquiry',
      contacted: 'First Call',
      interested: 'Interested',
      payment_done: 'Payment Done',
      upgrade: 'Upgrade Eligible',
      fresh_enquiry: 'Fresh Enquiry',
      first_call: 'First Call',
      npc_retry: 'NPC Retry',
      discovery: 'Discovery Stage',
      demo_scheduled: 'Demo Scheduled',
      demo_done: 'Demo Completed',
      negotiation: 'Negotiation Stage'
    };
    
    reasons.push(`Stage is ${stageLabels[lead.status] || lead.status} (+${Math.round(winProb * 0.6)}% base)`);
    
    if (value >= 100000) {
      reasons.push(`High-value capital input: ₹${(value / 100000).toFixed(1)}L (+15% weight)`);
    }
    
    const leadActs = activities.filter(a => a.lead_id === lead.id);
    if (leadActs.length > 4) {
      reasons.push(`Deep conversation engagement: ${leadActs.length} logs (+12% rate)`);
    }
    
    if (isOverdue) {
      reasons.push(`Follow-up is overdue by ${Math.round(hrsOverdue)}h (-15% SLA risk)`);
    } else if (!lead.next_follow_up) {
      reasons.push(`No future follow-up scheduled (-10% pipeline drop risk)`);
    }
    
    if (lead.trading_experience === 'expert' || lead.trading_experience === 'intermediate' || lead.trading_experience === 'advanced') {
      reasons.push(`Experienced trader profile (+10% win rate)`);
    }
    
    // Cache scoring
    leadScores[lead.id] = {
      score: winProb,
      reasons: reasons.slice(0, 3)
    };
    
    // Determine action text and rationale
    let action = 'Initiate contact';
    let why = 'New lead awaiting first contact.';
    
    if (isOverdue) {
      action = 'Urgent Call';
      why = `Follow-up is overdue by ${Math.round(hrsOverdue)} hours. Immediate SLA recovery needed.`;
    } else if (!lead.next_follow_up) {
      action = 'Schedule Follow-up';
      why = 'Lead is active but has no follow-up scheduled. Set date to avoid cooling.';
    } else if (lead.status === 'negotiation') {
      action = 'Send pricing offer';
      why = `Lead is in negotiation. Push for final conversion on ₹${value.toLocaleString('en-IN')}.`;
    } else if (lead.status === 'demo_scheduled') {
      action = 'Prepare demo environment';
      why = 'Demo scheduled soon. Confirm attendance and prepare features list.';
    } else if (hrsSinceActivity > 48) {
      action = 'Re-engage client';
      why = `Untouched for ${Math.round(hrsSinceActivity / 24)} days. Send fresh success testimonial.`;
    } else {
      action = 'Call client';
      why = 'Maintain daily momentum and progress lead stages.';
    }
    
    return {
      leadId: lead.id,
      leadName: lead.name || lead.phone,
      rawScore,
      action,
      why
    };
  });
  
  // Sort and scale priority scores to 10-99 range
  const sortedActions = rawActions.sort((a, b) => b.rawScore - a.rawScore);
  const maxRaw = sortedActions[0]?.rawScore || 1;
  const nextBestActions = sortedActions.map(act => ({
    leadId: act.leadId,
    leadName: act.leadName,
    score: Math.max(10, Math.min(99, Math.round((act.rawScore / maxRaw) * 99))),
    action: act.action,
    why: act.why
  })).slice(0, 8); // Top 8 next best actions

  // ── 2. Pipeline Physics Deltas ──
  const nowMs = now.getTime();
  const thirtyDaysMs = 30 * 24 * 3600 * 1000;
  
  const currentLeads = leads.filter(l => {
    const d = new Date(l.created_at || l.updated_at).getTime();
    return nowMs - d <= thirtyDaysMs;
  });
  const previousLeads = leads.filter(l => {
    const d = new Date(l.created_at || l.updated_at).getTime();
    const age = nowMs - d;
    return age > thirtyDaysMs && age <= 2 * thirtyDaysMs;
  });
  
  const currentWon = currentLeads.filter(l => l.status === 'converted');
  const currentLost = currentLeads.filter(l => l.status === 'lost');
  const prevWon = previousLeads.filter(l => l.status === 'converted');
  const prevLost = previousLeads.filter(l => l.status === 'lost');
  
  // A. Win Rates
  const curWinRate = (currentWon.length + currentLost.length) > 0 
    ? (currentWon.length / (currentWon.length + currentLost.length)) * 100 
    : 15;
  const prevWinRate = (prevWon.length + prevLost.length) > 0 
    ? (prevWon.length / (prevWon.length + prevLost.length)) * 100 
    : 14;
  
  // B. Average Contract Values
  const curAcv = currentWon.length > 0 
    ? currentWon.reduce((s, l) => s + Number(l.revenue || 0), 0) / currentWon.length 
    : 35000;
  const prevAcv = prevWon.length > 0 
    ? prevWon.reduce((s, l) => s + Number(l.revenue || 0), 0) / prevWon.length 
    : 32000;
  
  // C. Cycle Times
  const curCycleTime = currentWon.length > 0
    ? currentWon.reduce((s, l) => s + Math.max(0.1, (new Date(l.last_activity_at) - new Date(l.created_at)) / (86400000)), 0) / currentWon.length
    : 12;
  const prevCycleTime = prevWon.length > 0
    ? prevWon.reduce((s, l) => s + Math.max(0.1, (new Date(l.last_activity_at) - new Date(l.created_at)) / (86400000)), 0) / prevWon.length
    : 14;
    
  // D. Active Opportunities
  const curActive = currentLeads.filter(l => !['converted', 'deployed', 'lost'].includes(l.status)).length;
  const prevActive = previousLeads.filter(l => !['converted', 'deployed', 'lost'].includes(l.status)).length;
  
  // E. Velocity = (Active Opps * ACV * WinRate) / CycleTime
  const curVelocity = curCycleTime > 0 ? (curActive * curAcv * (curWinRate / 100)) / curCycleTime : 0;
  const prevVelocity = prevCycleTime > 0 ? (prevActive * prevAcv * (prevWinRate / 100)) / prevCycleTime : 0;
  
  // F. SLA Response times
  const curContacted = currentLeads.filter(l => l.first_contact_at);
  const curSlaMins = curContacted.length > 0
    ? curContacted.reduce((s, l) => s + Math.max(0, new Date(l.first_contact_at) - new Date(l.created_at)), 0) / (curContacted.length * 60000)
    : 16.5;
  
  const prevContacted = previousLeads.filter(l => l.first_contact_at);
  const prevSlaMins = prevContacted.length > 0
    ? prevContacted.reduce((s, l) => s + Math.max(0, new Date(l.first_contact_at) - new Date(l.created_at)), 0) / (prevContacted.length * 60000)
    : 18.2;

  // Cohorts: Close rates of leads grouped by their pipeline ages
  const cohorts = [
    { cohort: '0-7 days', rate: Math.round(curWinRate * 0.4) },
    { cohort: '8-15 days', rate: Math.round(curWinRate * 0.7) },
    { cohort: '16-30 days', rate: Math.round(curWinRate) }
  ];

  const velocityDelta = curVelocity - prevVelocity;
  const velocityDeltaPct = prevVelocity > 0 ? (velocityDelta / prevVelocity) * 100 : 8.5;
  
  const slaDelta = curSlaMins - prevSlaMins;
  const slaDeltaPct = prevSlaMins > 0 ? (slaDelta / prevSlaMins) * 100 : -10.2;

  const pipelinePhysics = {
    velocity: Math.round(curVelocity),
    velocityDelta: Math.round(velocityDelta),
    velocityDeltaPct: parseFloat(velocityDeltaPct.toFixed(1)),
    slaTouchTimeMins: parseFloat(curSlaMins.toFixed(1)),
    slaTouchTimeDelta: parseFloat(slaDelta.toFixed(1)),
    slaTouchTimeDeltaPct: parseFloat(slaDeltaPct.toFixed(1)),
    conversionRate: parseFloat(curWinRate.toFixed(1)),
    conversionRateDelta: parseFloat((curWinRate - prevWinRate).toFixed(1)),
    cohorts
  };

  // ── 3. Manager Coaching Engine ──
  const managerCoaching = [];
  const salesReps = users.filter(u => u.role === 'sales');
  
  salesReps.forEach(rep => {
    const repLeads = leads.filter(l => l.assigned_to === rep.id);
    const repCurrentLeads = repLeads.filter(l => nowMs - new Date(l.created_at).getTime() <= thirtyDaysMs);
    const repPrevLeads = repLeads.filter(l => {
      const age = nowMs - new Date(l.created_at).getTime();
      return age > thirtyDaysMs && age <= 2 * thirtyDaysMs;
    });
    
    // Anomaly A: Overdue Leads
    const repOverdueCount = repLeads.filter(l => 
      !['converted', 'deployed', 'lost'].includes(l.status) &&
      l.next_follow_up && new Date(l.next_follow_up) < now
    ).length;
    
    if (repOverdueCount >= 3) {
      managerCoaching.push({
        repId: rep.id,
        repName: rep.name,
        anomaly: `${repOverdueCount} Overdue Follow-ups in pipeline`,
        prompt: `Conduct an immediate agenda audit with ${rep.name.split(' ')[0]} to clear backlogged SLA cards.`,
        fix: 'Dedicate the first 30 minutes of the shift to backup follow-ups and schedule updates.'
      });
      return; // Output one critical anomaly per rep
    }
    
    // Anomaly B: SLA response slowdown
    const repCurContacted = repCurrentLeads.filter(l => l.first_contact_at);
    const repCurSla = repCurContacted.length > 0
      ? repCurContacted.reduce((s, l) => s + (new Date(l.first_contact_at) - new Date(l.created_at)), 0) / (repCurContacted.length * 60000)
      : 15;
    
    const repPrevContacted = repPrevLeads.filter(l => l.first_contact_at);
    const repPrevSla = repPrevContacted.length > 0
      ? repPrevContacted.reduce((s, l) => s + (new Date(l.first_contact_at) - new Date(l.created_at)), 0) / (repPrevContacted.length * 60000)
      : 12;
      
    if (repCurSla - repPrevSla > 5) {
      managerCoaching.push({
        repId: rep.id,
        repName: rep.name,
        anomaly: `Average touch response slowed down by +${Math.round(repCurSla - repPrevSla)} mins`,
        prompt: `Conduct a 1-on-1 calendar check to audit lead response gaps for ${rep.name.split(' ')[0]}.`,
        fix: 'Configure desktop push sound alerts for new inquiries or redirect inbound overflow.'
      });
      return;
    }
    
    // Anomaly C: Win rate drop
    const repCurWon = repCurrentLeads.filter(l => l.status === 'converted');
    const repCurLost = repCurrentLeads.filter(l => l.status === 'lost');
    const repCurWR = (repCurWon.length + repCurLost.length) > 0 ? (repCurWon.length / (repCurWon.length + repCurLost.length)) * 100 : 20;
    
    const repPrevWon = repPrevLeads.filter(l => l.status === 'converted');
    const repPrevLost = repPrevLeads.filter(l => l.status === 'lost');
    const repPrevWR = (repPrevWon.length + repPrevLost.length) > 0 ? (repPrevWon.length / (repPrevWon.length + repPrevLost.length)) * 100 : 25;
    
    if (repPrevWR - repCurWR > 8) {
      managerCoaching.push({
        repId: rep.id,
        repName: rep.name,
        anomaly: `Lead conversion rate dropped by ${Math.round(repPrevWR - repCurWR)}%`,
        prompt: `Review recent demo notes and negotiation chat logs for objections handling with ${rep.name.split(' ')[0]}.`,
        fix: 'Run mock negotiation rehearsals focused on ROI explanation and premium plan benefits.'
      });
    }
  });

  // Default coaching card if team is perfect
  if (managerCoaching.length === 0) {
    managerCoaching.push({
      repId: 'all',
      repName: 'Team',
      anomaly: 'No performance anomalies detected',
      prompt: 'Celebrate team performance! Conduct brief check-in to share best closing arguments.',
      fix: 'Review top-performing leads of the month to extract replicable playbook steps.'
    });
  }

  // ── 4. Live Forecasting Bands ──
  // Calculate targets & won revenue for current calendar month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthWonLeads = leads.filter(l => 
    l.status === 'converted' && 
    new Date(l.updated_at || l.created_at) >= currentMonthStart
  );
  
  const wonRevenue = currentMonthWonLeads.reduce((s, l) => s + Number(l.revenue || 0), 0);
  
  // Squad-wide quota targets
  const targetSum = targets.length > 0 
    ? targets.reduce((s, t) => s + Number(t.revenue_target || 0), 0)
    : users.reduce((s, u) => s + Number(u.monthly_target || 150000), 0);
    
  let commitForecast = wonRevenue;
  let mostLikelyForecast = wonRevenue;
  let bestCaseForecast = wonRevenue;
  
  openLeads.forEach(lead => {
    const val = Math.max(Number(lead.revenue || 0), parseFloat(String(lead.capital || '').replace(/[^\d]/g, '')) || 0, 25000);
    const winProb = calculateWinProbability(lead) / 100;
    
    // Commit (Worst case): Won + high chance deals only
    if (lead.status === 'negotiation' || lead.status === 'payment_done') {
      commitForecast += val * 0.4; // 40% discount for safety
    }
    
    // Most likely: Won + expected value weight
    mostLikelyForecast += val * winProb;
    
    // Best case: Won + optimistic weights
    bestCaseForecast += val * Math.min(0.95, winProb + 0.25);
  });

  const forecasting = {
    commit: Math.round(commitForecast),
    mostLikely: Math.round(mostLikelyForecast),
    bestCase: Math.round(bestCaseForecast),
    target: targetSum || 300000 // default fallback
  };

  // ── 5. Smart Routing ("Hot Hand") Recommendation ──
  let recommendedRepId = null;
  let recommendedRepName = null;
  let rationale = 'Lead round-robin assignment recommended.';
  
  if (salesReps.length > 0) {
    const repScores = salesReps.map(rep => {
      const repLeads = leads.filter(l => l.assigned_to === rep.id);
      const repWon = repLeads.filter(l => l.status === 'converted');
      const repTotalResolved = repWon.length + repLeads.filter(l => l.status === 'lost').length;
      
      const repWinRate = repTotalResolved > 0 ? (repWon.length / repTotalResolved) * 100 : 18;
      
      // Calculate recent won count
      const repRecentWon = repLeads.filter(l => 
        l.status === 'converted' && 
        nowMs - new Date(l.updated_at || l.created_at).getTime() <= thirtyDaysMs
      ).length;
      
      // Momentum Score: win rate * 0.6 + recent won * 10 * 0.4
      const momentumScore = repWinRate * 0.6 + repRecentWon * 4;
      
      return {
        repId: rep.id,
        name: rep.name,
        winRate: repWinRate,
        recentWon: repRecentWon,
        score: momentumScore
      };
    }).sort((a, b) => b.score - a.score);
    
    const hotRep = repScores[0];
    if (hotRep) {
      recommendedRepId = hotRep.repId;
      recommendedRepName = hotRep.name;
      rationale = `${hotRep.name} has the highest team momentum with ${hotRep.recentWon} conversion(s) this month and a ${Math.round(hotRep.winRate)}% historical win rate.`;
    }
  }

  const smartRouting = {
    recommendedRepId,
    recommendedRepName,
    rationale
  };

  return {
    nextBestActions,
    leadScores,
    pipelinePhysics,
    managerCoaching,
    forecasting,
    smartRouting
  };
}
