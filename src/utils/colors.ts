// A predefined palette of sophisticated, bamboo-themed color pairs
const TAG_PALETTE = [
  { bg: '#EAF0EB', text: '#2C3530' }, // Light Sage / Charcoal Green
  { bg: '#F8E9E4', text: '#8A3B24' }, // Light Terracotta / Deep Clay
  { bg: '#EBF2F6', text: '#2A4B5C' }, // Light Slate / Deep Ocean
  { bg: '#FDF3E1', text: '#9B6A1A' }, // Light Mustard / Deep Gold
  { bg: '#F2E8F2', text: '#5D2E5D' }, // Light Plum / Deep Purple
  { bg: '#E4F4F3', text: '#1F5C58' }, // Light Teal / Deep Pine
  { bg: '#FCEBEA', text: '#9C342F' }, // Light Rose / Deep Crimson
  { bg: '#EEF0D8', text: '#5C6314' }, // Light Olive / Deep Moss
];

/**
 * Consistently hashes a string to one of the colors in our palette.
 */
export function getHashColor(str: string): { bg: string; text: string } {
  if (!str) return TAG_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Math.abs to handle negative hashes
  const index = Math.abs(hash) % TAG_PALETTE.length;
  return TAG_PALETTE[index];
}
