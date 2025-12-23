import type { NoteMeta } from '../types/notes';

/**
 * Extracts wiki-style links from note content.
 * Matches [[note name]] or [[note name|display text]] patterns.
 * Also supports folder paths: [[Topic/SubTopic/Note]] or [[Topic/SubTopic/Note|Display Text]].
 * 
 * @param content - The note content to extract links from
 * @returns Array of linked note titles/paths (as written in the link)
 */
export function extractLinks(content: string): string[] {
  if (!content) return [];
  
  // Match [[note name]] or [[note name|display text]]
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || [];
  return matches
    .map(m => m.replace(/\[\[|\]\]/g, '').split('|')[0].trim())
    .filter(Boolean);
}

/**
 * Normalizes a path or title for matching (case-insensitive, forward slashes).
 * Converts backslashes to forward slashes and normalizes the path.
 */
function normalizePath(path: string): string {
  return path
    .replace(/\\/g, '/')  // Convert backslashes to forward slashes
    .toLowerCase()
    .trim();
}

/**
 * Builds a backlinks index that maps note titles/paths to arrays of notes that link to them.
 * Supports both title-based matching ([[Note]]) and path-based matching ([[Topic/SubTopic/Note]]).
 * The index uses normalized keys (case-insensitive) as keys.
 * 
 * @param notes - Array of all notes in the vault
 * @param getNoteContent - Function to get the content of a note by its path
 * @returns Map from note title/path to array of notes that link to it
 */
export async function buildBacklinksIndex(
  notes: NoteMeta[],
  getNoteContent: (path: string) => Promise<string>
): Promise<Map<string, NoteMeta[]>> {
  const index = new Map<string, NoteMeta[]>();
  
  // Create maps for matching links to notes
  // - noteTitleMap: maps normalized title -> NoteMeta (for [[Note]] style links)
  // - notePathMap: maps normalized path (id) -> NoteMeta (for [[Topic/SubTopic/Note]] style links)
  const noteTitleMap = new Map<string, NoteMeta[]>();
  const notePathMap = new Map<string, NoteMeta>();
  
  const flattenNotes = (items: NoteMeta[]): NoteMeta[] => {
    const result: NoteMeta[] = [];
    for (const item of items) {
      if (item.type === 'file') {
        result.push(item);
        // Store by title (normalized, case-insensitive)
        // Multiple notes can have the same title, so we use an array
        const normalizedTitle = normalizePath(item.title);
        const existing = noteTitleMap.get(normalizedTitle) || [];
        noteTitleMap.set(normalizedTitle, [...existing, item]);
        
        // Store by path (id) - this is unique
        // The id is like "Magma/test.md" or "Magma\test.md" (platform-dependent)
        // We normalize it to use forward slashes and remove .md extension
        const pathWithoutExt = item.id.replace(/\.md$/i, ''); // Remove .md (case-insensitive)
        const normalizedPath = normalizePath(pathWithoutExt);
        notePathMap.set(normalizedPath, item);
        console.log(`[Backlinks] Stored path: "${item.id}" -> normalized: "${normalizedPath}"`);
      } else if (item.type === 'folder' && item.children) {
        result.push(...flattenNotes(item.children));
      }
    }
    return result;
  };
  
  const allNotes = flattenNotes(notes);
  
  console.log('[Backlinks] Building index for', allNotes.length, 'notes');
  console.log('[Backlinks] Note titles:', Array.from(noteTitleMap.keys()));
  console.log('[Backlinks] Note paths:', Array.from(notePathMap.keys()));
  
  // Process each note to find links
  for (const note of allNotes) {
    try {
      const content = await getNoteContent(note.path);
      if (!content) continue;
      
      const links = extractLinks(content);
      if (links.length > 0) {
        console.log(`[Backlinks] Note "${note.title}" (${note.id}) contains links:`, links);
      }
      
      // For each link found, add this note to the backlinks of the linked note
      for (const linkText of links) {
        const normalizedLink = normalizePath(linkText);
        
        // Try to match by path first (more specific)
        // Path format: "Topic/SubTopic/Note" (without .md extension)
        let linkedNote: NoteMeta | null = null;
        let matchKey: string | null = null;
        
        // Try multiple path variations to handle different link formats
        const pathVariations = [
          normalizedLink,                                    // Exact match: "magma/test"
          normalizedLink.replace(/\.md$/, ''),              // Without .md: "magma/test" (if user wrote "magma/test.md")
          normalizedLink + '.md',                            // With .md: "magma/test.md"
        ];
        
        console.log(`[Backlinks] Trying to match link "${linkText}" (normalized: "${normalizedLink}")`);
        console.log(`[Backlinks] Available paths in map:`, Array.from(notePathMap.keys()));
        
        for (const pathVar of pathVariations) {
          if (notePathMap.has(pathVar)) {
            linkedNote = notePathMap.get(pathVar)!;
            matchKey = pathVar;
            console.log(`[Backlinks] ✓ Matched "${linkText}" by path variation "${pathVar}" to "${linkedNote.title}" (${linkedNote.id})`);
            break;
          }
        }
        
        // If still no match, try to find by partial path match (for cases where folder structure might differ)
        if (!linkedNote && normalizedLink.includes('/')) {
          // Try to find notes where the path ends with the link text
          for (const [storedPath, note] of notePathMap.entries()) {
            // Check if stored path ends with the link (e.g., "magma/test" matches "magma/test")
            // or if the link is a suffix of the stored path
            const pathParts = storedPath.split('/');
            const linkParts = normalizedLink.split('/');
            
            // Check if the last parts of the stored path match the link
            if (pathParts.length >= linkParts.length) {
              const storedSuffix = pathParts.slice(-linkParts.length).join('/');
              if (storedSuffix === normalizedLink || storedPath === normalizedLink) {
                linkedNote = note;
                matchKey = storedPath;
                console.log(`[Backlinks] ✓ Matched "${linkText}" by partial path match "${storedPath}" to "${linkedNote.title}" (${linkedNote.id})`);
                break;
              }
            }
          }
        }
        
        if (!linkedNote) {
          // Try to match by title (less specific, might match multiple notes)
          // Only match by title if the link doesn't contain a slash (indicating it's not a path)
          if (!normalizedLink.includes('/')) {
            const matchingNotes = noteTitleMap.get(normalizedLink);
            if (matchingNotes && matchingNotes.length > 0) {
              // If multiple notes have the same title, prefer the one in the same folder or root
              // For now, just use the first match
              linkedNote = matchingNotes[0];
              matchKey = normalizedLink;
              if (matchingNotes.length > 1) {
                console.log(`[Backlinks] Multiple notes found with title "${linkText}", using first: "${linkedNote.title}" (${linkedNote.id})`);
              } else {
                console.log(`[Backlinks] Matched "${linkText}" by title to "${linkedNote.title}" (${linkedNote.id})`);
              }
            }
          }
        }
        
        if (linkedNote && matchKey) {
          if (linkedNote.id !== note.id) {
            // Add this note to the backlinks of the linked note
            const existing = index.get(matchKey) || [];
            // Avoid duplicates
            if (!existing.find(n => n.id === note.id)) {
              index.set(matchKey, [...existing, note]);
              console.log(`[Backlinks] Added "${note.title}" (${note.id}) as backlink to "${linkedNote.title}" (${linkedNote.id})`);
            }
          } else {
            console.log(`[Backlinks] Skipping self-link: "${note.title}" -> "${linkText}"`);
          }
        } else {
          console.log(`[Backlinks] Link "${linkText}" in "${note.title}" doesn't match any note`);
        }
      }
    } catch (error) {
      console.error(`Error processing note ${note.title} for backlinks:`, error);
    }
  }
  
  console.log('[Backlinks] Index built:', Array.from(index.entries()).map(([key, notes]) => `${key}: [${notes.map(n => `${n.title} (${n.id})`).join(', ')}]`));
  return index;
}

/**
 * Gets backlinks for a specific note.
 * Checks both path-based and title-based matches.
 * 
 * @param note - The note to get backlinks for
 * @param backlinksIndex - The backlinks index
 * @returns Array of notes that link to the given note
 */
export function getBacklinks(
  note: NoteMeta | null,
  backlinksIndex: Map<string, NoteMeta[]>
): NoteMeta[] {
  if (!note) return [];
  
  // Try to get backlinks by path first (more specific)
  const normalizedPath = normalizePath(note.id.replace(/\.md$/, ''));
  let backlinks = backlinksIndex.get(normalizedPath) || [];
  
  // Also check by title (in case someone linked using just the title)
  const normalizedTitle = normalizePath(note.title);
  const titleBacklinks = backlinksIndex.get(normalizedTitle) || [];
  
  // Combine both, avoiding duplicates
  const allBacklinks = new Map<string, NoteMeta>();
  backlinks.forEach(n => allBacklinks.set(n.id, n));
  titleBacklinks.forEach(n => allBacklinks.set(n.id, n));
  
  const result = Array.from(allBacklinks.values());
  console.log(`[Backlinks] Getting backlinks for "${note.title}" (path: "${normalizedPath}", title: "${normalizedTitle}"):`, result.map(n => `${n.title} (${n.id})`));
  return result;
}

