import { FieldType, getDefaultValue } from '@/types';

/**
 * Best-effort value-based coercion.
 * Takes a raw JSON value and guarantees it matches the target FieldType.
 */
export function coerceFieldValue(value: unknown, targetType: FieldType): unknown {
  const defaultVal = getDefaultValue(targetType);

  if (value === null || value === undefined) {
    return defaultVal;
  }

  switch (targetType) {
    case 'strict_boolean':
      if (typeof value === 'boolean') return value;
      // If it's a string like "true", convert it. Otherwise fallback to false.
      if (typeof value === 'string') return value.toLowerCase() === 'true';
      return !!value; // Numbers > 0 become true, etc.

    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === 'yes') return true;
        if (lower === 'false' || lower === 'no') return false;
      }
      // If we don't confidently know it's true/false, Tri-state gracefully uses null (Unknown)
      return null;

    case 'number':
    case 'dollar':
    case 'sqft':
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
        return isNaN(parsed) ? defaultVal : parsed;
      }
      if (typeof value === 'boolean') return value ? 1 : 0;
      return defaultVal;

    case 'score':
      if (typeof value === 'number') return Math.max(1, Math.min(5, Math.round(value)));
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultVal : Math.max(1, Math.min(5, parsed));
      }
      return defaultVal;

    case 'text':
    case 'label':
    case 'link':
    case 'address':
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      if (Array.isArray(value)) return value.join(', ');
      return defaultVal;

    case 'tag':
    case 'pictures':
      if (Array.isArray(value)) return value.map(String);
      if (typeof value === 'string') return value.trim() ? [value] : [];
      if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
      return defaultVal;

    case 'beds_baths':
      if (typeof value === 'object' && value !== null && 'beds' in value) return value;
      return defaultVal;

    default:
      return defaultVal;
  }
}
