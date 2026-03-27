import OpenAI from 'openai';

/**
 * Prompt Sanitizer for Image Generation
 *
 * Rewrites image prompts that violate content policies to be more acceptable
 * while maintaining the visual concept.
 */
export class PromptSanitizer {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Rewrite an image prompt to be less likely to violate content policies
   *
   * @param originalPrompt - The prompt that was rejected
   * @param rejectionReason - Reason for rejection (if provided)
   * @param attemptNumber - Which retry attempt this is (1-3)
   * @returns Sanitized prompt
   */
  async sanitizePrompt(
    originalPrompt: string,
    rejectionReason?: string,
    attemptNumber: number = 1
  ): Promise<string> {
    console.log(`🔧 [Sanitizer] Rewriting prompt (attempt ${attemptNumber})`);
    console.log(`   Original: ${originalPrompt.substring(0, 100)}...`);

    const systemPrompt = this.getSystemPrompt(attemptNumber);
    const userPrompt = this.getUserPrompt(originalPrompt, rejectionReason);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const sanitizedPrompt = response.choices[0]?.message?.content?.trim() || originalPrompt;

      console.log(`   ✅ Sanitized: ${sanitizedPrompt.substring(0, 100)}...`);

      return sanitizedPrompt;

    } catch (error) {
      console.error(`❌ [Sanitizer] Failed to sanitize prompt:`, error);
      // Fallback: Use generic safe prompt
      return this.getFallbackPrompt(attemptNumber);
    }
  }

  /**
   * Get system prompt based on attempt number (gets progressively more cautious)
   */
  private getSystemPrompt(attemptNumber: number): string {
    const basePrompt = `You are an expert at rewriting image generation prompts to comply with content policies while preserving the core visual concept.

Your task: Rewrite prompts that were REJECTED by image generation APIs to be policy-compliant while maintaining journalistic value.

Key guidelines:
- CRITICAL: Remove ALL references to specific politicians, public figures, or identifiable people
  • Replace "President [Name]", "Speaker [Name]", etc. with "government official" or "political leader"
  • Remove "[person]'s name" patterns entirely
  • Replace political titles (Speaker, President, Senator) with generic terms
  • Avoid any possessive references (their face, his portrait, her image)
- Avoid controversial symbols, flags, or partisan imagery
- Focus on neutral, factual visual elements (buildings, documents, graphs, landscapes, abstract graphics)
- Use abstract or symbolic representations instead of literal depictions
- Keep prompts professional and news-appropriate
- Maintain photorealistic style for credibility
- When in doubt, use ultra-generic imagery (empty chambers, building exteriors, data visualizations)`;

    if (attemptNumber === 1) {
      return basePrompt + `\n\nApproach: Make MINIMAL changes - just remove obvious policy violations.`;
    } else if (attemptNumber === 2) {
      return basePrompt + `\n\nApproach: Make MODERATE changes - be more cautious, use more abstract imagery.`;
    } else {
      return basePrompt + `\n\nApproach: Make AGGRESSIVE changes - prioritize safety over specificity. Use very generic, neutral imagery.`;
    }
  }

  /**
   * Get user prompt for sanitization
   */
  private getUserPrompt(originalPrompt: string, rejectionReason?: string): string {
    let prompt = `Original prompt (REJECTED):\n"${originalPrompt}"\n\n`;

    if (rejectionReason) {
      prompt += `Rejection reason: ${rejectionReason}\n\n`;
    }

    prompt += `Rewrite this prompt to be policy-compliant while maintaining the visual concept. Return ONLY the new prompt, no explanations.`;

    return prompt;
  }

  /**
   * Fallback prompts if AI sanitization fails (ultra-safe generic images)
   */
  private getFallbackPrompt(attemptNumber: number): string {
    const fallbacks = [
      'Photorealistic image of the United States Capitol building exterior, professional news photography, neutral lighting',
      'Professional photograph of a modern government building facade, brutalist architecture, clean geometric shapes',
      'Abstract visualization of political data, clean infographic style, blue and gray color scheme, minimalist design',
      'High-quality stock photo of a legislative chamber interior, empty seats, neutral perspective, architectural photography',
    ];

    return fallbacks[Math.min(attemptNumber - 1, fallbacks.length - 1)];
  }
}

/**
 * Quick sanitization without full AI rewrite (faster, rule-based)
 * Use this for first attempt before calling AI
 */
export function quickSanitize(prompt: string): string {
  let sanitized = prompt;

  // Remove specific person names (common political figures)
  const namesPattern = /(Biden|Trump|Harris|Obama|Clinton|Pelosi|McConnell|Sanders|Warren|DeSantis|Pence)/gi;
  sanitized = sanitized.replace(namesPattern, 'political leader');

  // Remove political titles that reference specific people
  const titlesPattern = /(President|Vice President|Speaker|Senate Majority Leader|Chief Justice|Governor|Mayor|Prime Minister|Chancellor)( [A-Z][a-z]+)+/gi;
  sanitized = sanitized.replace(titlesPattern, 'government official');

  // Remove "[person]'s name" patterns (e.g., "Speaker political leader's name")
  sanitized = sanitized.replace(/\b(political leader|government official|official|leader|politician)['']s name\b/gi, 'text overlay');
  sanitized = sanitized.replace(/\band (Speaker|President|Senator|Representative|Governor) /gi, 'and '); // Remove titles before names
  sanitized = sanitized.replace(/\b(Speaker|President|Senator|Representative|Governor)\b/gi, 'official');

  // Remove partisan references
  const partisanPattern = /(Democrat|Republican|GOP|MAGA|liberal|conservative) (politician|lawmaker|senator|representative)/gi;
  sanitized = sanitized.replace(partisanPattern, 'government official');

  // Remove controversial symbols
  sanitized = sanitized.replace(/confederate flag/gi, 'historical flag');
  sanitized = sanitized.replace(/nazi|swastika/gi, 'historical symbol');

  // Remove any possessive references to people (including possessive nouns like "official's face")
  sanitized = sanitized.replace(/\b(their|his|her|whose) (face|portrait|image|photo|picture)\b/gi, 'a symbolic representation');
  sanitized = sanitized.replace(/\b(official|leader|politician|person)['']s (face|portrait|image|photo|picture)\b/gi, 'symbolic graphic');

  // If changed, add safety modifiers
  if (sanitized !== prompt) {
    // Only add if not already present
    if (!sanitized.includes('professional news photography')) {
      sanitized += ', professional news photography, neutral perspective';
    }
  }

  return sanitized;
}
