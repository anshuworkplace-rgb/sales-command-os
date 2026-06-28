/**
 * PIPELINE PHYSICS ENGINE
 * Elite revenue teams don't just track if deals close; they track the speed and velocity of the pipeline.
 * This engine calculates Pipeline Velocity, SLA (Service Level Agreement) adherence, and cycle lengths.
 */

export function calculatePipelinePhysics(leads, userId = null) {
  // Filter leads if a specific user (or manager's team) is requested
  const filteredLeads = userId 
    ? leads.filter(l => l.assigned_to === userId) 
    : leads;

  // 1. SLA Tracking (Time to first touch)
  // Time between lead creation/enquiry and first contact (in minutes)
  const contactedLeads = filteredLeads.filter(l => l.first_contact_at && (l.enquiry_date || l.created_at));
  const totalSlaMs = contactedLeads.reduce((acc, l) => {
    const start = new Date(l.enquiry_date || l.created_at);
    return acc + Math.max(0, new Date(l.first_contact_at) - start);
  }, 0);
  const avgSlaMinutes = contactedLeads.length > 0 ? (totalSlaMs / contactedLeads.length) / 60000 : 0;

  // 2. Win Rate
  const closedWon = filteredLeads.filter(l => l.status === 'converted');
  const closedLost = filteredLeads.filter(l => l.status === 'lost');
  const totalResolved = closedWon.length + closedLost.length;
  const winRate = totalResolved > 0 ? closedWon.length / totalResolved : 0;

  // 3. Average Contract Value (ACV)
  const totalWonRevenue = closedWon.reduce((acc, l) => acc + Number(l.revenue || 0), 0);
  const acv = closedWon.length > 0 ? totalWonRevenue / closedWon.length : 0;

  // 4. Sales Cycle Length (Days from creation to closed_won)
  const cycleLengths = closedWon.map(l => {
    // We use last_activity_at as the proxy for the close date if it's closed_won
    const start = new Date(l.enquiry_date || l.created_at);
    return Math.max(0.1, (new Date(l.last_activity_at) - start) / (1000 * 60 * 60 * 24));
  });
  const avgCycleLengthDays = cycleLengths.length > 0 
    ? cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length 
    : 30; // Default to 30 days if no closed deals yet

  // 5. Pipeline Velocity (₹ / Day)
  // Formula: (Number of Active Opps × ACV × Win Rate) / Average Sales Cycle Length
  const activeOpps = filteredLeads.filter(l => !['converted', 'lost'].includes(l.status)).length;
  const velocity = avgCycleLengthDays > 0 ? (activeOpps * acv * winRate) / avgCycleLengthDays : 0;

  // 6. SLA Violations (Uncontacted leads older than 15 minutes)
  const now = new Date();
  const slaViolations = filteredLeads.filter(l => {
    if (l.first_contact_at || l.status === 'lost' || l.status === 'converted') return false;
    const start = new Date(l.enquiry_date || l.created_at);
    const ageMs = now - start;
    return ageMs > 15 * 60 * 1000; // 15 mins in MS
  });

  return {
    avgSlaMinutes,
    winRate,
    acv,
    avgCycleLengthDays,
    velocity,
    activeOpps,
    slaViolations: slaViolations.length,
    violatingLeads: slaViolations.sort((a, b) => {
      const timeA = new Date(a.enquiry_date || a.created_at).getTime();
      const timeB = new Date(b.enquiry_date || b.created_at).getTime();
      return timeA - timeB;
    })
  };
}
