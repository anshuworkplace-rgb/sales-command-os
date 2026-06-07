import { STAGES } from '../utils/constants';

// Since logic moved to Supabase backend, these are simple fallbacks for UI mapping
export function calculatePriorityScore(lead, activitiesCount = 0) {
  return lead.lead_score || 50;
}

export function getRecommendedAction(lead) {
  if (!lead) return 'Follow up';
  if (lead.next_best_action) return lead.next_best_action; // If passed from priority queue
  
  const status = lead.status;
  if (status === STAGES.NEW) return 'Send intro message on WhatsApp';
  if (status === STAGES.CONTACTED) return 'Check interest & share value prop';
  if (status === STAGES.INTERESTED) return 'Share pricing & close the deal';
  if (status === STAGES.PAYMENT_DONE) return 'Discuss premium upgrade options';
  return 'Follow up and maintain relationship';
}

export function getNextBestActions(leads, activities, limit = 5) {
  // Simple fallback sort if priority queue fails
  return [...leads]
    .sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0))
    .slice(0, limit);
}
