/**
 * Color palette for tags - provides a variety of distinct colors
 */
const TAG_COLORS = [
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', hover: 'hover:bg-rose-100/80' },
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', hover: 'hover:bg-blue-100/80' },
  { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', hover: 'hover:bg-green-100/80' },
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', hover: 'hover:bg-purple-100/80' },
  { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', hover: 'hover:bg-yellow-100/80' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', hover: 'hover:bg-indigo-100/80' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', hover: 'hover:bg-pink-100/80' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', hover: 'hover:bg-cyan-100/80' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', hover: 'hover:bg-orange-100/80' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', hover: 'hover:bg-teal-100/80' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', hover: 'hover:bg-amber-100/80' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', hover: 'hover:bg-emerald-100/80' },
] as const;

/**
 * Inline tag colors for text rendering (lighter, more subtle)
 */
const INLINE_TAG_COLORS = [
  'text-rose-600',
  'text-blue-600',
  'text-green-600',
  'text-purple-600',
  'text-yellow-600',
  'text-indigo-600',
  'text-pink-600',
  'text-cyan-600',
  'text-orange-600',
  'text-teal-600',
  'text-amber-600',
  'text-emerald-600',
] as const;

/**
 * Simple hash function to convert a string to a number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Gets a consistent color scheme for a tag based on its name
 * @param tagName - The tag name (without #)
 * @returns Color scheme object with bg, text, border, and hover classes
 */
export function getTagColor(tagName: string) {
  const normalizedTag = tagName.toLowerCase();
  const hash = hashString(normalizedTag);
  const colorIndex = hash % TAG_COLORS.length;
  return TAG_COLORS[colorIndex];
}

/**
 * Gets a consistent inline color class for a tag based on its name
 * @param tagName - The tag name (without #)
 * @returns Tailwind text color class
 */
export function getInlineTagColor(tagName: string): string {
  const normalizedTag = tagName.toLowerCase();
  const hash = hashString(normalizedTag);
  const colorIndex = hash % INLINE_TAG_COLORS.length;
  return INLINE_TAG_COLORS[colorIndex];
}

