import { formatDistanceToNow, differenceInHours, differenceInMinutes, format, isToday, isTomorrow, isPast, addHours, addDays, startOfTomorrow } from 'date-fns';

/**
 * Get time remaining or overdue as human-readable string.
 */
export function getTimeStatus(dateStr) {
  if (!dateStr) return { text: 'No date', type: 'muted', minutes: 0 };
  const date = new Date(dateStr);
  const now = new Date();
  const diffMin = differenceInMinutes(date, now);
  const diffHours = differenceInHours(date, now);

  if (diffMin < 0) {
    // Overdue
    const absDiffMin = Math.abs(diffMin);
    if (absDiffMin < 60) return { text: `${absDiffMin}m overdue`, type: 'overdue', minutes: diffMin };
    const absDiffHours = Math.abs(diffHours);
    if (absDiffHours < 24) return { text: `${absDiffHours}h overdue`, type: 'overdue', minutes: diffMin };
    const days = Math.floor(absDiffHours / 24);
    return { text: `${days}d overdue`, type: 'overdue', minutes: diffMin };
  }

  if (diffMin < 60) return { text: `${diffMin}m left`, type: 'urgent', minutes: diffMin };
  if (diffHours < 4) return { text: `${diffHours}h left`, type: 'due-today', minutes: diffMin };
  if (diffHours < 24) return { text: `${diffHours}h left`, type: 'due-today', minutes: diffMin };
  if (diffHours < 48) return { text: 'Tomorrow', type: 'future', minutes: diffMin };
  const days = Math.floor(diffHours / 24);
  return { text: `${days}d left`, type: 'future', minutes: diffMin };
}

/**
 * Get follow-up urgency category
 */
export function getFollowUpUrgency(dateStr) {
  if (!dateStr) return 'none';
  const date = new Date(dateStr);
  const now = new Date();
  if (isPast(date)) return 'overdue';
  if (isToday(date)) return 'due-today';
  if (isTomorrow(date)) return 'tomorrow';
  return 'future';
}

/**
 * Format date for display
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (e) {
    return dateStr;
  }
}

/**
 * Format relative time
 */
export function formatRelative(dateStr) {
  if (!dateStr) return '—';
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

/**
 * Get smart follow-up suggestion based on stage
 */
export function getSuggestedFollowUp(stage) {
  const now = new Date();
  switch (stage) {
    case 'new': return addHours(now, 1).toISOString();
    case 'contacted': return addHours(now, 4).toISOString();
    case 'interested': return addDays(now, 1).toISOString();
    case 'payment_done': return addDays(now, 3).toISOString();
    case 'upgrade': return addDays(now, 7).toISOString();
    default: return addHours(startOfTomorrow(), 10).toISOString();
  }
}

/**
 * Calculate response time in minutes between two dates
 */
export function responseTimeMinutes(from, to) {
  if (!from || !to) return null;
  return differenceInMinutes(new Date(to), new Date(from));
}

/**
 * Format duration in minutes to human readable
 */
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes < 0) minutes = Math.abs(minutes);
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Format datetime string for input[type="datetime-local"]
 */
export function toLocalDateTimeString(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
