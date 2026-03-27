/**
 * Prompt Simplifier - Creates lighter, more generic prompts for retry attempts
 *
 * When image generation fails with the original detailed prompt,
 * this creates a simplified fallback version that's more likely to succeed.
 *
 * Strategy:
 * - Remove specific details (names, numbers, locations)
 * - Keep core visual concept
 * - Use broader, safer language
 * - Remove potentially problematic words
 */

export class PromptSimplifier {
  /**
   * Simplify a prompt to increase generation success rate
   *
   * @param originalPrompt - The detailed prompt that failed
   * @param attemptNumber - Which retry attempt (higher = more simplified)
   * @returns Simplified prompt
   */
  static simplify(originalPrompt: string, attemptNumber: number = 1): string {
    let simplified = originalPrompt;

    // Level 1: Light simplification (retry 1)
    if (attemptNumber >= 1) {
      // Remove specific names and numbers
      simplified = simplified
        .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, 'person') // "John Smith" → "person"
        .replace(/\b\d+(?:\.\d+)?\s*(million|billion|thousand|percent|%)/gi, 'many') // "5.2 million" → "many"
        .replace(/\b\d{4}\b/g, '') // Remove years: "2024" → ""
        .replace(/\$\d+(?:,\d+)*(?:\.\d+)?/g, 'money'); // "$1,234.56" → "money"

      // Remove specific locations (but keep generic ones like "city", "building")
      simplified = simplified
        .replace(/\b(in|at|near)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g, 'in a location') // "in New York City" → "in a location"
        .replace(/\b(Washington|Moscow|Beijing|London|Paris|Berlin|Tokyo|Delhi|Mumbai|Shanghai)\b/gi, 'a capital city');

      // Remove potentially controversial terms
      const controversialTerms = [
        'war', 'conflict', 'violence', 'attack', 'weapon', 'bomb', 'gun', 'military',
        'protest', 'riot', 'death', 'killed', 'wounded', 'victim', 'criminal',
        'scandal', 'corruption', 'fraud', 'investigation', 'arrest', 'prison',
      ];

      controversialTerms.forEach((term) => {
        const regex = new RegExp(`\\b${term}s?\\b`, 'gi');
        simplified = simplified.replace(regex, 'situation');
      });

      // Clean up multiple spaces and trim
      simplified = simplified.replace(/\s{2,}/g, ' ').trim();
    }

    // Level 2: Aggressive simplification (retry 2+)
    if (attemptNumber >= 2) {
      // Extract only the core visual concept
      // Remove all modifiers and keep just the subject + setting

      // Remove adjectives that might cause issues
      const problematicAdjectives = [
        'violent', 'bloody', 'graphic', 'disturbing', 'shocking',
        'controversial', 'political', 'religious', 'explicit',
        'dramatic', 'intense', 'chaotic', 'destructive',
      ];

      problematicAdjectives.forEach((adj) => {
        const regex = new RegExp(`\\b${adj}\\b`, 'gi');
        simplified = simplified.replace(regex, '');
      });

      // Simplify to basic scene components
      // If prompt mentions indoor/outdoor, keep that
      if (simplified.toLowerCase().includes('indoor') || simplified.toLowerCase().includes('interior')) {
        simplified = 'indoor scene, professional setting, clean composition';
      } else if (simplified.toLowerCase().includes('outdoor') || simplified.toLowerCase().includes('exterior')) {
        simplified = 'outdoor scene, natural setting, clear daylight';
      } else if (simplified.toLowerCase().includes('office') || simplified.toLowerCase().includes('workplace')) {
        simplified = 'modern office environment, professional atmosphere';
      } else if (simplified.toLowerCase().includes('street') || simplified.toLowerCase().includes('urban')) {
        simplified = 'urban street scene, daytime, modern city';
      } else if (simplified.toLowerCase().includes('building') || simplified.toLowerCase().includes('architecture')) {
        simplified = 'architectural exterior, modern building, daytime';
      } else {
        // Ultimate fallback: Generic news background
        simplified = 'professional news background, neutral setting, clean composition, broadcast quality';
      }
    }

    console.log(`[Prompt Simplifier] Simplified prompt (level ${attemptNumber}):`);
    console.log(`  Original: ${originalPrompt.substring(0, 100)}...`);
    console.log(`  Simplified: ${simplified}`);

    return simplified;
  }

  /**
   * Quick check if a prompt is likely to cause policy violations
   * (Used for pre-validation)
   */
  static isPotentiallyProblematic(prompt: string): boolean {
    const problematicPatterns = [
      /\b(war|violence|weapon|bomb|gun|blood|death|kill|wounded)\b/i,
      /\b(nude|naked|sexual|explicit)\b/i,
      /\b(drug|cocaine|heroin|marijuana)\b/i,
      /\b(hate|racist|discrimination)\b/i,
    ];

    return problematicPatterns.some((pattern) => pattern.test(prompt));
  }

  /**
   * Generate a completely generic fallback prompt
   * Use this as absolute last resort
   */
  static getGenericFallback(): string {
    const fallbacks = [
      'professional news broadcast background, modern studio, clean composition',
      'abstract news background, geometric shapes, professional colors',
      'soft gradient background, news appropriate, broadcast quality',
      'modern digital background, abstract patterns, professional aesthetic',
      'clean minimal background, suitable for news broadcast',
    ];

    // Rotate through fallbacks (prevents all scenes using same image)
    const index = Math.floor(Math.random() * fallbacks.length);
    return fallbacks[index];
  }
}
