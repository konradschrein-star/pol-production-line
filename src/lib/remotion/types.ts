/**
 * Shared types for Remotion compositions (browser-safe, no Node.js dependencies)
 */

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface SceneSentenceInfo {
  sceneOrder: number;
  sentenceText: string;
  narrativePosition: string;  // Used to detect hook vs body ('opening' = hook)
}

export interface SentenceGroup {
  text: string;
  words: WordTimestamp[];
  start: number;
  end: number;
  duration: number;
}

/**
 * Group words into sentences based on punctuation
 * Browser-safe implementation for Remotion
 */
export function groupIntoSentences(words: WordTimestamp[]): SentenceGroup[] {
  if (!words || words.length === 0) {
    return [];
  }

  const sentences: SentenceGroup[] = [];
  let currentWords: WordTimestamp[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentWords.push(word);

    // Check if this word ends a sentence (contains . ! ? and is not an abbreviation)
    const endsWithPunctuation = /[.!?]$/.test(word.word);
    const isLastWord = i === words.length - 1;

    // Sentence boundaries: punctuation or last word
    if (endsWithPunctuation || isLastWord) {
      if (currentWords.length > 0) {
        const firstWord = currentWords[0];
        const lastWord = currentWords[currentWords.length - 1];

        sentences.push({
          text: currentWords.map(w => w.word).join(' '),
          words: [...currentWords],
          start: firstWord.start,
          end: lastWord.end,
          duration: lastWord.end - firstWord.start,
        });

        currentWords = [];
      }
    }
  }

  // If there are remaining words, create a final sentence
  if (currentWords.length > 0) {
    const firstWord = currentWords[0];
    const lastWord = currentWords[currentWords.length - 1];

    sentences.push({
      text: currentWords.map(w => w.word).join(' '),
      words: [...currentWords],
      start: firstWord.start,
      end: lastWord.end,
      duration: lastWord.end - firstWord.start,
    });
  }

  return sentences;
}
