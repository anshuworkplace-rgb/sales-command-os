/**
 * Format number as Indian currency
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0';
  return '₹' + amount.toLocaleString('en-IN');
}

/**
 * Format large numbers with abbreviations
 */
export function formatCompact(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + 'L';
  if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + 'K';
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Format percentage
 */
export function formatPercent(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return value.toFixed(decimals) + '%';
}

/**
 * Get initials from name
 */
export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Truncate text
 */
export function truncate(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

/**
 * Phone number display format
 */
export function formatPhone(phone) {
  if (!phone) return '';
  return phone.replace(/(\+\d{2})\s?(\d{5})\s?(\d{5})/, '$1 $2 $3');
}
