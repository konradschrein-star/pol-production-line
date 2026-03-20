import { AIProvider, ProviderType } from './types';
import { ClaudeProvider } from './providers/claude';
import { GoogleProvider } from './providers/google';
import { GroqProvider } from './providers/groq';
import { OpenAIProvider } from './providers/openai';

export * from './types';

export function createAIProvider(
  providerType?: ProviderType
): AIProvider {
  const provider = providerType || (process.env.AI_PROVIDER as ProviderType) || 'openai';

  switch (provider) {
    case 'claude': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not set in environment');
      }
      console.log('🤖 Using Claude AI provider');
      return new ClaudeProvider(apiKey);
    }

    case 'google': {
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY not set in environment');
      }
      console.log('🤖 Using Google AI (Gemini) provider');
      return new GoogleProvider(apiKey);
    }

    case 'groq': {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('GROQ_API_KEY not set in environment');
      }
      console.log('🤖 Using Groq AI provider');
      return new GroqProvider(apiKey);
    }

    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not set in environment');
      }
      console.log('🤖 Using OpenAI (ChatGPT) provider');
      return new OpenAIProvider(apiKey);
    }

    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

// Convenience function for quick analysis
export async function analyzeScript(rawScript: string, providerType?: ProviderType) {
  const provider = createAIProvider(providerType);
  return provider.analyzeScript(rawScript);
}
