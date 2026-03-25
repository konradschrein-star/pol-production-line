/**
 * Script Segmentation Module
 *
 * Intelligently parses news scripts into sentences with narrative context.
 * Handles abbreviations, provides context windows, and assigns narrative position.
 */

export interface SegmentedSentence {
  index: number;
  text: string;
  narrativePosition: 'opening' | 'development' | 'evidence' | 'conclusion';
  contextWindow: {
    previous: string | null;
    current: string;
    next: string | null;
  };
}

/**
 * Common abbreviations that should NOT be treated as sentence boundaries
 */
const ABBREVIATIONS = [
  'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.',
  'U.S.', 'U.K.', 'E.U.', 'U.N.',
  'Inc.', 'Ltd.', 'Corp.', 'Co.',
  'Jan.', 'Feb.', 'Mar.', 'Apr.', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Sept.', 'Oct.', 'Nov.', 'Dec.',
  'St.', 'Ave.', 'Blvd.', 'Rd.',
  'etc.', 'vs.', 'i.e.', 'e.g.',
];

/**
 * Splits text into sentences, handling abbreviations intelligently
 */
function splitIntoSentences(text: string): string[] {
  // Replace abbreviations temporarily to protect them from splitting
  let protectedText = text;
  const abbreviationMap = new Map<string, string>();

  ABBREVIATIONS.forEach((abbr, idx) => {
    const placeholder = `__ABBR${idx}__`;
    abbreviationMap.set(placeholder, abbr);
    protectedText = protectedText.replace(new RegExp(abbr.replace('.', '\\.'), 'g'), placeholder);
  });

  // Split on sentence boundaries (., !, ?)
  // Regex: match period/exclamation/question followed by space and capital letter (or end of string)
  const sentencePattern = /([.!?])\s+(?=[A-Z])|([.!?])$/g;

  const rawSentences = protectedText.split(sentencePattern)
    .filter(s => s && s.trim().length > 0)
    .map(s => s.trim());

  // Reconstruct sentences and restore abbreviations
  const sentences: string[] = [];
  let currentSentence = '';

  for (const segment of rawSentences) {
    if (segment.match(/^[.!?]$/)) {
      // Punctuation marker - append to current sentence
      currentSentence += segment;
    } else {
      // Text segment
      if (currentSentence) {
        // Finish previous sentence
        sentences.push(currentSentence.trim());
        currentSentence = '';
      }
      currentSentence = segment;
    }
  }

  // Add final sentence if exists
  if (currentSentence.trim()) {
    sentences.push(currentSentence.trim());
  }

  // Restore abbreviations
  return sentences.map(sentence => {
    let restored = sentence;
    abbreviationMap.forEach((original, placeholder) => {
      restored = restored.replace(new RegExp(placeholder, 'g'), original);
    });
    return restored;
  }).filter(s => s.length > 0);
}

/**
 * Assigns narrative position based on sentence index and total count
 */
function assignNarrativePosition(
  index: number,
  total: number
): 'opening' | 'development' | 'evidence' | 'conclusion' {
  const percentage = (index / total) * 100;

  if (percentage < 15) return 'opening';
  if (percentage < 70) return 'development';
  if (percentage < 85) return 'evidence';
  return 'conclusion';
}

/**
 * Segments a raw script into structured sentences with context
 */
export function segmentScript(rawScript: string): SegmentedSentence[] {
  const sentences = splitIntoSentences(rawScript);
  const total = sentences.length;

  return sentences.map((sentence, index) => ({
    index,
    text: sentence,
    narrativePosition: assignNarrativePosition(index, total),
    contextWindow: {
      previous: index > 0 ? sentences[index - 1] : null,
      current: sentence,
      next: index < total - 1 ? sentences[index + 1] : null,
    },
  }));
}

/**
 * Utility: Get sentence count from raw script (for validation)
 */
export function getSentenceCount(rawScript: string): number {
  return splitIntoSentences(rawScript).length;
}
