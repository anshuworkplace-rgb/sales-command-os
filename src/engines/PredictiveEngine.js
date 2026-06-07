/**
 * PREDICTIVE INTELLIGENCE ENGINE
 * Advanced heuristics to predict deal closures and identify "Hot Hand" reps.
 */

export function calculateConfidenceScore(lead, activities) {
  let score = 50; // Base score

  // 1. Velocity (Fast movement = higher confidence)
  const ageMs = new Date() - new Date(lead.created_at);
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  
  if (ageDays < 2 && lead.status !== 'enquiry') score += 15;
  if (ageDays > 30 && lead.status !== 'converted') score -= 20;

  // 2. Engagement Depth (More activities = higher confidence)
  const leadActivities = activities.filter(a => a.lead_id === lead.id);
  score += Math.min(20, leadActivities.length * 3); // Max 20 pts from activity

  // 3. Status Momentum
  if (lead.status === 'called') score += 5;
  if (lead.status === 'details_sent') score += 10;
  if (lead.status === 'demo_scheduled') score += 15;
  if (lead.status === 'demo_done') score += 25;
  if (lead.status === 'negotiation') score += 35;

  // 4. Time since last interaction
  const lastInteraction = new Date(lead.last_activity_at || lead.created_at);
  const inactiveDays = (new Date() - lastInteraction) / (1000 * 60 * 60 * 24);
  if (inactiveDays > 7 && !['converted', 'lost'].includes(lead.status)) {
    score -= inactiveDays * 2; // Decay over time
  }

  return Math.max(1, Math.min(99, Math.round(score)));
}

/**
 * Identify the "Hot Hand" - The rep with the highest recent win momentum.
 */
export function identifyHotHand(leads, users) {
  const salesReps = users.filter(u => u.role === 'sales');
  const now = new Date();
  const last7Days = new Date(now.setDate(now.getDate() - 7));

  const hotHand = salesReps.map(rep => {
    const recentWins = leads.filter(l => 
      l.assigned_to === rep.id && 
      l.status === 'converted' && 
      new Date(l.last_activity_at) > last7Days
    );
    const recentRevenue = recentWins.reduce((s, l) => s + Number(l.revenue || 0), 0);
    
    return {
      repId: rep.id,
      name: rep.name,
      momentumScore: (recentWins.length * 10) + (recentRevenue / 10000)
    };
  }).sort((a, b) => b.momentumScore - a.momentumScore)[0];

  return hotHand && hotHand.momentumScore > 0 ? hotHand : null;
}

/**
 * Forecast if a user or team will hit their monthly target.
 */
export function forecastTargetHit(currentRevenue, velocityPerDay, targetAmount, daysLeftInMonth) {
  if (targetAmount <= 0) return { projected: currentRevenue, willHit: true, confidence: 100 };
  
  const projectedRevenue = currentRevenue + (velocityPerDay * daysLeftInMonth);
  const gap = targetAmount - currentRevenue;
  
  if (gap <= 0) return { projected: projectedRevenue, willHit: true, confidence: 99 };
  
  const probability = (projectedRevenue / targetAmount) * 100;
  
  return {
    projected: projectedRevenue,
    willHit: projectedRevenue >= targetAmount,
    confidence: Math.max(1, Math.min(99, Math.round(probability)))
  };
}
