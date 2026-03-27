// API key validation for different AI providers

import { net } from 'electron';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  provider?: string;
  modelAccess?: string[];
}

/**
 * Validate OpenAI API key
 */
export async function validateOpenAI(apiKey: string): Promise<ValidationResult> {
  try {
    const request = net.request({
      method: 'GET',
      url: 'https://api.openai.com/v1/models',
    });

    request.setHeader('Authorization', `Bearer ${apiKey}`);

    return new Promise((resolve) => {
      let responseData = '';

      request.on('response', (response) => {
        if (response.statusCode === 200) {
          response.on('data', (chunk) => {
            responseData += chunk.toString();
          });

          response.on('end', () => {
            try {
              const data = JSON.parse(responseData);
              const models = data.data?.map((m: any) => m.id) || [];
              resolve({
                valid: true,
                provider: 'OpenAI',
                modelAccess: models.filter((m: string) => m.includes('gpt')),
              });
            } catch (error) {
              resolve({ valid: false, error: 'Invalid response format' });
            }
          });
        } else if (response.statusCode === 401) {
          resolve({ valid: false, error: 'Invalid API key' });
        } else {
          resolve({ valid: false, error: `HTTP ${response.statusCode}` });
        }
      });

      request.on('error', (error) => {
        resolve({ valid: false, error: error.message });
      });

      request.end();
    });
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate Anthropic Claude API key
 */
export async function validateClaude(apiKey: string): Promise<ValidationResult> {
  try {
    const request = net.request({
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
    });

    request.setHeader('x-api-key', apiKey);
    request.setHeader('anthropic-version', '2023-06-01');
    request.setHeader('content-type', 'application/json');

    const body = JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'test' }],
    });

    return new Promise((resolve) => {
      let responseData = '';

      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve({
              valid: true,
              provider: 'Anthropic Claude',
              modelAccess: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'],
            });
          } else if (response.statusCode === 401) {
            resolve({ valid: false, error: 'Invalid API key' });
          } else {
            resolve({ valid: false, error: `HTTP ${response.statusCode}` });
          }
        });
      });

      request.on('error', (error) => {
        resolve({ valid: false, error: error.message });
      });

      request.write(body);
      request.end();
    });
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate Google AI API key
 */
export async function validateGoogle(apiKey: string): Promise<ValidationResult> {
  try {
    const request = net.request({
      method: 'GET',
      url: `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
    });

    return new Promise((resolve) => {
      let responseData = '';

      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          if (response.statusCode === 200) {
            try {
              const data = JSON.parse(responseData);
              const models = data.models?.map((m: any) => m.name.split('/').pop()) || [];
              resolve({
                valid: true,
                provider: 'Google Gemini',
                modelAccess: models.filter((m: string) => m.includes('gemini')),
              });
            } catch (error) {
              resolve({ valid: false, error: 'Invalid response format' });
            }
          } else if (response.statusCode === 400 || response.statusCode === 403) {
            resolve({ valid: false, error: 'Invalid API key' });
          } else {
            resolve({ valid: false, error: `HTTP ${response.statusCode}` });
          }
        });
      });

      request.on('error', (error) => {
        resolve({ valid: false, error: error.message });
      });

      request.end();
    });
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate Groq API key
 */
export async function validateGroq(apiKey: string): Promise<ValidationResult> {
  try {
    const request = net.request({
      method: 'GET',
      url: 'https://api.groq.com/openai/v1/models',
    });

    request.setHeader('Authorization', `Bearer ${apiKey}`);

    return new Promise((resolve) => {
      let responseData = '';

      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          if (response.statusCode === 200) {
            try {
              const data = JSON.parse(responseData);
              const models = data.data?.map((m: any) => m.id) || [];
              resolve({
                valid: true,
                provider: 'Groq',
                modelAccess: models,
              });
            } catch (error) {
              resolve({ valid: false, error: 'Invalid response format' });
            }
          } else if (response.statusCode === 401) {
            resolve({ valid: false, error: 'Invalid API key' });
          } else {
            resolve({ valid: false, error: `HTTP ${response.statusCode}` });
          }
        });
      });

      request.on('error', (error) => {
        resolve({ valid: false, error: error.message });
      });

      request.end();
    });
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate API key for any provider
 */
export async function validateAPIKey(
  provider: 'openai' | 'claude' | 'google' | 'groq',
  apiKey: string
): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API key is required' };
  }

  switch (provider) {
    case 'openai':
      return validateOpenAI(apiKey);
    case 'claude':
      return validateClaude(apiKey);
    case 'google':
      return validateGoogle(apiKey);
    case 'groq':
      return validateGroq(apiKey);
    default:
      return { valid: false, error: 'Unknown provider' };
  }
}
