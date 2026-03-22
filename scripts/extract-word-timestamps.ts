#!/usr/bin/env tsx
/**
 * Extract word-level timestamps from avatar video using OpenAI Whisper API
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, createReadStream, writeFileSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  console.log('🎵 Extracting audio from video...');

  // Extract audio to WAV format (Whisper works best with WAV)
  const command = `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`;

  try {
    await execAsync(command);
    console.log('✅ Audio extracted successfully');
  } catch (error) {
    throw new Error(`Failed to extract audio: ${error}`);
  }
}

async function transcribeWithWhisper(audioPath: string): Promise<WordTimestamp[]> {
  console.log('🎤 Transcribing with Whisper API (word-level timestamps)...');

  const audioFile = createReadStream(audioPath);

  const response = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
  });

  if (!response.words || response.words.length === 0) {
    throw new Error('No word-level timestamps returned from Whisper');
  }

  console.log(`✅ Transcribed ${response.words.length} words`);
  console.log(`📝 Full text: "${response.text}"`);

  return response.words.map((w: any) => ({
    word: w.word,
    start: w.start,
    end: w.end,
  }));
}

async function main() {
  const avatarVideoPath = process.argv[2];
  const outputJsonPath = process.argv[3] || '/tmp/word-timestamps.json';

  if (!avatarVideoPath) {
    console.error('Usage: tsx extract-word-timestamps.ts <avatar-video-path> [output-json-path]');
    process.exit(1);
  }

  if (!existsSync(avatarVideoPath)) {
    console.error(`❌ Video file not found: ${avatarVideoPath}`);
    process.exit(1);
  }

  // Temporary audio file
  const audioPath = '/tmp/avatar-audio.wav';

  try {
    // Step 1: Extract audio from video
    await extractAudio(avatarVideoPath, audioPath);

    // Step 2: Transcribe with Whisper
    const wordTimestamps = await transcribeWithWhisper(audioPath);

    // Step 3: Save to JSON
    const output = {
      totalWords: wordTimestamps.length,
      duration: wordTimestamps[wordTimestamps.length - 1].end,
      words: wordTimestamps,
    };

    writeFileSync(outputJsonPath, JSON.stringify(output, null, 2));
    console.log(`\n✅ Word timestamps saved to: ${outputJsonPath}`);
    console.log(`📊 Total words: ${wordTimestamps.length}`);
    console.log(`⏱️  Duration: ${output.duration.toFixed(2)}s`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
