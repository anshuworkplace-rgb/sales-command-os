import { calculateHeatScore } from '../engines/leadIntelligence';

/**
 * Calculates a priority queue of leads based on their heat scores.
 * @param {Array} leads - The list of leads to sort.
 * @param {number} limit - The maximum number of leads to return.
 * @returns {Array} The top priority leads.
 */
export function getPriorityQueue(leads, limit = 10) {
  if (!leads || !Array.isArray(leads)) return [];
  
  return [...leads]
    .map(lead => ({
      ...lead,
      _heat: calculateHeatScore(lead)
    }))
    .sort((a, b) => b._heat - a._heat)
    .slice(0, limit);
}
