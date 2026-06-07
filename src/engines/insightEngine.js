export function getUserPerformanceStats(userId, leads, activities) {
  const userLeads = leads.filter(l => l.assigned_to === userId);
  const totalRevenue = userLeads.reduce((sum, l) => sum + (Number(l.revenue) || 0), 0);
  
  const conversions = userLeads.filter(l => 
    l.status === 'converted'
  ).length;
  
  const overdue = userLeads.filter(l => 
    l.next_follow_up && new Date(l.next_follow_up) < new Date() && !['converted', 'lost'].includes(l.status)
  ).length;

  // Calculate Streak: consecutive days with at least 1 task_completed
  const userActivities = activities.filter(a => a.performed_by === userId && a.type === 'task_completed');
  const streak = calculateStreak(userActivities);

  return {
    totalLeads: userLeads.length,
    totalRevenue,
    conversionRate: userLeads.length > 0 ? (conversions / userLeads.length) * 100 : 0,
    overdue,
    followUpsCompleted: userActivities.length,
    avgResponseTime: 1800, // Mock 30 mins for demo since this requires complex SQL
    streak,
  };
}

// Helper to calculate consecutive active days
function calculateStreak(userActivities) {
  if (!userActivities || userActivities.length === 0) return 0;
  
  // Sort activities by date descending
  const sortedDates = [...new Set(userActivities.map(a => 
    new Date(a.created_at).toDateString()
  ))].sort((a, b) => new Date(b) - new Date(a));

  let streak = 0;
  let currentDate = new Date();
  // Strip time for comparison
  currentDate.setHours(0,0,0,0);
  
  const firstActivityDate = new Date(sortedDates[0]);
  firstActivityDate.setHours(0,0,0,0);
  
  // If the last activity was not today or yesterday, streak is 0
  const diffDays = Math.floor((currentDate - firstActivityDate) / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return 0;

  let checkDate = new Date(sortedDates[0]);
  for (let i = 0; i < sortedDates.length; i++) {
    const d = new Date(sortedDates[i]);
    d.setHours(0,0,0,0);
    if (d.getTime() === checkDate.getTime()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1); // Move back one day
    } else {
      break; // Streak broken
    }
  }
  
  return streak;
}

export function generateInsights(leads, activities, users) {
  const insights = [];
  
  // High value active leads
  const hotLeads = leads.filter(l => l.lead_score >= 80 && !['converted', 'lost'].includes(l.status));
  if (hotLeads.length > 0) {
    insights.push({
      type: 'success',
      icon: '🔥',
      title: `${hotLeads.length} Hot Leads Detected`,
      description: 'Prioritize these immediately to close pending revenue.'
    });
  }

  // Overdue check
  const overdue = leads.filter(l => l.next_follow_up && new Date(l.next_follow_up) < new Date() && !['converted', 'lost'].includes(l.status));
  if (overdue.length > 0) {
    insights.push({
      type: 'danger',
      icon: '⚠️',
      title: `${overdue.length} Overdue Follow-ups`,
      description: 'Team SLA breached. High risk of losing momentum.'
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'success',
      icon: '✨',
      title: 'Pipeline is Healthy',
      description: 'Execution is on track. No critical bottlenecks detected.'
    });
  }

  return insights;
}
