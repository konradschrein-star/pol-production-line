import OpenAI from 'openai';
import { createReadStream, existsSync } from 'fs';
import { WordTimestamp } from '../remotion/types';

/**
 * Whisper Transcription Service
 * Generates word-level timestamps from audio/video files
 */
export class WhisperTranscriptionService {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Transcribe audio/video file and extract word timestamps
   * @param filePath - Path to audio/video file (MP3, MP4, M4A, WAV, etc.)
   * @returns Array of word timestamps
   */
  async transcribe(filePath: string): Promise<WordTimestamp[]> {
    console.log(`🎤 [Whisper] Transcribing: ${filePath}`);

    // Verify file exists
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      // Call Whisper API with word-level timestamps
      const transcription = await this.client.audio.transcriptions.create({
        file: createReadStream(filePath),
        model: 'whisper-1',
        response_format: 'verbose_json', // Required for word timestamps
        timestamp_granularities: ['word'], // Word-level timestamps
      });

      // Extract word timestamps
      const words: WordTimestamp[] = [];

      if ('words' in transcription && Array.isArray(transcription.words)) {
        for (const wordData of transcription.words) {
          words.push({
            word: wordData.word,
            start: wordData.start,
            end: wordData.end,
          });
        }
      }

      console.log(`✅ [Whisper] Transcription complete:`);
      console.log(`   Words: ${words.length}`);
      console.log(`   Duration: ${words.length > 0 ? words[words.length - 1].end.toFixed(2) : 0}s`);

      return words;

    } catch (error) {
      console.error(`❌ [Whisper] Transcription failed:`, error);
      throw new Error(`Whisper transcription failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract audio from video file using FFmpeg (if needed)
   * This is a helper method - you may need to implement FFmpeg extraction separately
   */
  async extractAudio(videoPath: string, outputAudioPath: string): Promise<void> {
    // Note: This requires FFmpeg to be installed
    // Implementation would use child_process to call FFmpeg
    throw new Error('Audio extraction not implemented yet. Whisper can process video files directly.');
  }
}

/**
 * Convenience function to transcribe a file
 */
export async function transcribeFile(filePath: string): Promise<WordTimestamp[]> {
  const service = new WhisperTranscriptionService();
  return service.transcribe(filePath);
}
