/**
 * Extracts all tags from Markdown text.
 * Matches patterns like #tag, #tag-name, #tag_name, and [[tag]], [[tag-name]], etc.
 * Excludes tags that are part of code blocks (```code```) or inline code (`code`).
 * 
 * @param text - The Markdown content to extract tags from
 * @returns Array of unique tag names (without the # or [[]]), sorted alphabetically
 * 
 * @example
 * ```typescript
 * const tags = extractHashtags('#project-alpha This is a #note with [[tag]] and `#code` tag');
 * // Returns: ['note', 'project-alpha', 'tag']
 * ```
 */
export function extractHashtags(text: string): string[] {
  const tags = new Set<string>();
  
  // Split by lines to handle code blocks
  const lines = text.split('\n');
  let inCodeBlock = false;
  
  for (const line of lines) {
    // Check for code block delimiters
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    
    // Skip lines inside code blocks
    if (inCodeBlock) {
      continue;
    }
    
    // Find all inline code spans first
    const inlineCodeRegex = /`[^`]*`/g;
    const inlineCodeRanges: Array<{ start: number; end: number }> = [];
    let codeMatch;
    
    while ((codeMatch = inlineCodeRegex.exec(line)) !== null) {
      inlineCodeRanges.push({
        start: codeMatch.index,
        end: codeMatch.index + codeMatch[0].length
      });
    }
    
    // Helper function to check if a position is inside inline code
    const isInInlineCode = (pos: number) => {
      return inlineCodeRanges.some(
        range => pos >= range.start && pos < range.end
      );
    };
    
    // Find all hashtags (#tag)
    const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
    let match;
    
    while ((match = hashtagRegex.exec(line)) !== null) {
      const tagStart = match.index;
      if (!isInInlineCode(tagStart)) {
        const tag = match[1].toLowerCase();
        if (tag.length > 0) {
          tags.add(tag);
        }
      }
    }
    
    // Find all wikilink tags ([[tag]] or [[tag with spaces]])
    // Exclude aliases like [[tag|alias]] - we only want the tag part before the pipe
    const wikilinkTagRegex = /\[\[([^\]|]+?)\]\]/g;
    let wikilinkMatch;
    
    while ((wikilinkMatch = wikilinkTagRegex.exec(line)) !== null) {
      const tagStart = wikilinkMatch.index;
      if (!isInInlineCode(tagStart)) {
        // Extract tag name (before pipe if alias exists) and trim whitespace
        const tagName = wikilinkMatch[1].split('|')[0].trim();
        if (tagName.length > 0) {
          // Normalize: lowercase and replace spaces with hyphens for consistency
          const tag = tagName.toLowerCase().replace(/\s+/g, '-');
          tags.add(tag);
        }
      }
    }
  }
  
  return Array.from(tags).sort();
}

/**
 * Extracts tags from a single line of text.
 * Simpler version for inline display that doesn't handle code blocks.
 * Excludes tags that are part of inline code (`code`).
 * Supports both #hashtag and [[tag]] syntax.
 * 
 * @param line - A single line of text to extract tags from
 * @returns Array of tag names (without the # or [[]]) found in the line
 * 
 * @example
 * ```typescript
 * const tags = extractHashtagsFromLine('This is a #note with [[tag]] and `#code` tag');
 * // Returns: ['note', 'tag']
 * ```
 */
export function extractHashtagsFromLine(line: string): string[] {
  const tags: string[] = [];
  
  // Find inline code spans
  const inlineCodeRegex = /`[^`]*`/g;
  const inlineCodeRanges: Array<{ start: number; end: number }> = [];
  let codeMatch;
  
  while ((codeMatch = inlineCodeRegex.exec(line)) !== null) {
    inlineCodeRanges.push({
      start: codeMatch.index,
      end: codeMatch.index + codeMatch[0].length
    });
  }
  
  // Helper function to check if a position is inside inline code
  const isInInlineCode = (pos: number) => {
    return inlineCodeRanges.some(
      range => pos >= range.start && pos < range.end
    );
  };
  
  // Find hashtags (#tag)
  const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
  let match;
  
  while ((match = hashtagRegex.exec(line)) !== null) {
    const tagStart = match.index;
    if (!isInInlineCode(tagStart)) {
      const tag = match[1].toLowerCase();
      if (tag.length > 0) {
        tags.push(tag);
      }
    }
  }
  
  // Find wikilink tags ([[tag]] or [[tag with spaces]])
  // Exclude aliases like [[tag|alias]] - we only want the tag part before the pipe
  const wikilinkTagRegex = /\[\[([^\]|]+?)\]\]/g;
  let wikilinkMatch;
  
  while ((wikilinkMatch = wikilinkTagRegex.exec(line)) !== null) {
    const tagStart = wikilinkMatch.index;
    if (!isInInlineCode(tagStart)) {
      // Extract tag name (before pipe if alias exists) and trim whitespace
      const tagName = wikilinkMatch[1].split('|')[0].trim();
      if (tagName.length > 0) {
        // Normalize: lowercase and replace spaces with hyphens for consistency
        const tag = tagName.toLowerCase().replace(/\s+/g, '-');
        tags.push(tag);
      }
    }
  }
  
  return tags;
}

