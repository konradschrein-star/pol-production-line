import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

export interface WordTimestamp {
  word: string;
  start: number;  // seconds
  end: number;    // seconds
}

export interface TranscriptionResult {
  text: string;
  words: WordTimestamp[];
  duration: number;
}

/**
 * Transcribe audio from MP4 file using OpenAI Whisper API
 * Returns word-level timestamps for precise scene timing
 */
export async function transcribeAudio(
  audioFilePath: string
): Promise<TranscriptionResult> {
  console.log(`🎙️  [Transcribe] Starting transcription: ${audioFilePath}`);

  try {
    // Read audio file
    const audioBuffer = fs.readFileSync(audioFilePath);

    // Prepare form data
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.mp4',
      contentType: 'video/mp4',
    });
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json'); // Includes word timestamps
    formData.append('timestamp_granularities[]', 'word'); // Word-level timing (array format)

    // Call OpenAI Whisper API
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
      }
    );

    const { text, words } = response.data;

    // Validate response has words
    if (!words || words.length === 0) {
      throw new Error('Whisper response missing word timestamps');
    }

    // Transform to our interface
    const wordTimestamps: WordTimestamp[] = words.map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }));

    // Calculate duration from last word's end time
    const duration = wordTimestamps[wordTimestamps.length - 1].end;

    console.log(`✅ [Transcribe] Success: ${words.length} words, ${duration.toFixed(2)}s`);

    return {
      text,
      words: wordTimestamps,
      duration,
    };

  } catch (error) {
    console.error(`❌ [Transcribe] Failed:`, error);
    throw new Error(`Transcription failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Group words into sentences based on timing gaps and punctuation
 * Used for body phase pacing (1 image per 1-2 sentences)
 */
export interface SentenceGroup {
  text: string;
  startWord: number;
  endWord: number;
  start: number;
  end: number;
  wordCount: number;
}

export function groupIntoSentences(
  words: WordTimestamp[],
  pauseThreshold: number = 0.5  // Gap >0.5s = sentence boundary
): SentenceGroup[] {
  const sentences: SentenceGroup[] = [];
  let currentSentence: WordTimestamp[] = [];
  let sentenceStartIdx = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentSentence.push(word);

    // Check if this is a sentence boundary
    const isLastWord = i === words.length - 1;
    const nextWord = !isLastWord ? words[i + 1] : null;
    const gap = nextWord ? nextWord.start - word.end : 0;

    const endsWithPunctuation = /[.!?]$/.test(word.word);
    const hasLongPause = gap > pauseThreshold;

    if (isLastWord || endsWithPunctuation || hasLongPause) {
      // Commit current sentence
      sentences.push({
        text: currentSentence.map(w => w.word).join(' '),
        startWord: sentenceStartIdx,
        endWord: i,
        start: currentSentence[0].start,
        end: currentSentence[currentSentence.length - 1].end,
        wordCount: currentSentence.length,
      });

      // Reset for next sentence
      currentSentence = [];
      sentenceStartIdx = i + 1;
    }
  }

  return sentences;
}
