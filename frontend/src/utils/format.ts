import { formatDistanceToNow, format, parseISO } from 'date-fns';

export function relativeTime(isoString: string): string {
  try {
    const date = parseISO(isoString);
    const dist = formatDistanceToNow(date, { addSuffix: false });
    if (dist === 'less than a minute') return 'now';
    return dist
      .replace('about ', '')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace(' days', 'd')
      .replace(' day', 'd')
      .replace(' months', 'mo')
      .replace(' month', 'mo')
      .replace(' years', 'y')
      .replace(' year', 'y');
  } catch {
    return '';
  }
}

export function formatDate(isoString: string): string {
  try {
    const date = parseISO(isoString);
    const now = new Date();
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d');
    }
    return format(date, 'MMM d, yyyy');
  } catch {
    return '';
  }
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
