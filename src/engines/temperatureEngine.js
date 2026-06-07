export function calculateTemperature(leadScore) {
  if (leadScore >= 70) return 'HOT';
  if (leadScore >= 40) return 'WARM';
  return 'COLD';
}
