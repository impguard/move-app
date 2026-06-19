/**
 * Extracts a short, human-readable address from a full Nominatim display_name.
 * e.g. "123 Main St, Los Angeles, Los Angeles County, California, 90012, US" → "123 Main St, Los Angeles"
 */
export function formatShortAddress(fullAddress: string): string {
  if (!fullAddress) return fullAddress;
  const parts = fullAddress.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return fullAddress;
  // Keep up to first 2 parts (street + city)
  return parts.slice(0, 2).join(', ');
}

export function formatDollar(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSqft(value: number): string {
  return `${new Intl.NumberFormat('en-US').format(value)} sq ft`;
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
