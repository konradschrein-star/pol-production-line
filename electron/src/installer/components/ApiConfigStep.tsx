import React from 'react';

export interface ApiConfig {
  aiProvider: 'openai' | 'claude' | 'google' | 'groq';
  openaiKey?: string;
  claudeKey?: string;
  googleKey?: string;
  groqKey?: string;
  whiskToken?: string;
}

export interface ApiConfigStepProps {
  initialData: Partial<ApiConfig>;
  onValidate: (data: ApiConfig, valid: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

/**
 * API Configuration step - Configure AI provider and API keys
 *
 * Features:
 * - Multi-provider support (OpenAI, Claude, Google, Groq)
 * - Masked password inputs
 * - Real-time validation with IPC calls
 * - Help links to API provider docs
 */
export function ApiConfigStep({ initialData, onValidate, onNext, onBack }: ApiConfigStepProps) {
  const [aiProvider, setAiProvider] = React.useState<ApiConfig['aiProvider']>(
    initialData.aiProvider || 'openai'
  );
  const [openaiKey, setOpenaiKey] = React.useState(initialData.openaiKey || '');
  const [claudeKey, setClaudeKey] = React.useState(initialData.claudeKey || '');
  const [googleKey, setGoogleKey] = React.useState(initialData.googleKey || '');
  const [groqKey, setGroqKey] = React.useState(initialData.groqKey || '');
  const [whiskToken, setWhiskToken] = React.useState(initialData.whiskToken || '');

  const [validationStatus, setValidationStatus] = React.useState<Record<string, ValidationStatus>>({
    openai: 'idle',
    claude: 'idle',
    google: 'idle',
    groq: 'idle',
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Validate current provider's API key
  const validateCurrentKey = async () => {
    const currentKey = getCurrentKey();
    if (!currentKey || currentKey.trim() === '') {
      setErrors({ ...errors, [aiProvider]: 'API key is required' });
      return false;
    }

    setValidationStatus({ ...validationStatus, [aiProvider]: 'validating' });
    setErrors({ ...errors, [aiProvider]: '' });

    try {
      const result = await window.electronAPI.config.validateAPIKey(aiProvider, currentKey);

      if (result.valid) {
        setValidationStatus({ ...validationStatus, [aiProvider]: 'valid' });
        updateData(true);
        return true;
      } else {
        setValidationStatus({ ...validationStatus, [aiProvider]: 'invalid' });
        setErrors({ ...errors, [aiProvider]: result.error || 'Invalid API key' });
        updateData(false);
        return false;
      }
    } catch (err: any) {
      setValidationStatus({ ...validationStatus, [aiProvider]: 'invalid' });
      setErrors({ ...errors, [aiProvider]: err.message || 'Validation failed' });
      updateData(false);
      return false;
    }
  };

  const getCurrentKey = (): string => {
    switch (aiProvider) {
      case 'openai':
        return openaiKey;
      case 'claude':
        return claudeKey;
      case 'google':
        return googleKey;
      case 'groq':
        return groqKey;
      default:
        return '';
    }
  };

  const updateData = (valid: boolean) => {
    const data: ApiConfig = {
      aiProvider,
      openaiKey,
      claudeKey,
      googleKey,
      groqKey,
      whiskToken,
    };
    onValidate(data, valid);
  };

  const handleNext = async () => {
    const isValid = await validateCurrentKey();
    if (isValid) {
      onNext();
    }
  };

  const providerInfo = {
    openai: {
      label: 'OpenAI API Key',
      placeholder: 'sk-...',
      link: 'https://platform.openai.com/api-keys',
      description: 'GPT-4 for script analysis',
    },
    claude: {
      label: 'Anthropic API Key',
      placeholder: 'sk-ant-...',
      link: 'https://console.anthropic.com/settings/keys',
      description: 'Claude for script analysis',
    },
    google: {
      label: 'Google AI API Key',
      placeholder: 'AIza...',
      link: 'https://makersuite.google.com/app/apikey',
      description: 'Gemini for script analysis',
    },
    groq: {
      label: 'Groq API Key',
      placeholder: 'gsk_...',
      link: 'https://console.groq.com/keys',
      description: 'Groq for fast inference',
    },
  };

  const currentStatus = validationStatus[aiProvider];
  const currentError = errors[aiProvider];
  const isValidated = currentStatus === 'valid';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          API Configuration
        </h2>
        <p className="text-gray-400">
          Configure your AI provider and API keys. These are required to analyze scripts and generate images.
        </p>
      </div>

      {/* AI Provider Selection */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 shadow">
        <label htmlFor="ai-provider" className="mb-2 block text-sm font-medium text-gray-300">
          AI Provider
        </label>

        <select
          id="ai-provider"
          value={aiProvider}
          onChange={(e) => {
            setAiProvider(e.target.value as ApiConfig['aiProvider']);
            // Reset validation status when switching providers
            setErrors({});
          }}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-sm text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="openai">OpenAI (GPT-4)</option>
          <option value="claude">Anthropic Claude</option>
          <option value="google">Google Gemini</option>
          <option value="groq">Groq</option>
        </select>

        <p className="mt-2 text-xs text-gray-500">
          {providerInfo[aiProvider].description}
        </p>
      </div>

      {/* API Key Input (Dynamic based on provider) */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 shadow">
        <label
          htmlFor="api-key"
          className="mb-2 block text-sm font-medium text-gray-300"
        >
          {providerInfo[aiProvider].label}
        </label>

        <div className="flex space-x-3">
          <input
            id="api-key"
            type="password"
            value={getCurrentKey()}
            onChange={(e) => {
              const value = e.target.value;
              switch (aiProvider) {
                case 'openai':
                  setOpenaiKey(value);
                  break;
                case 'claude':
                  setClaudeKey(value);
                  break;
                case 'google':
                  setGoogleKey(value);
                  break;
                case 'groq':
                  setGroqKey(value);
                  break;
              }
              // Reset validation when key changes
              setValidationStatus({ ...validationStatus, [aiProvider]: 'idle' });
              setErrors({ ...errors, [aiProvider]: '' });
            }}
            placeholder={providerInfo[aiProvider].placeholder}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm text-white shadow-sm focus:outline-none focus:ring-2 ${
              currentStatus === 'valid'
                ? 'border-green-600 bg-green-900/20 focus:border-green-500 focus:ring-green-500/50'
                : currentStatus === 'invalid'
                ? 'border-red-600 bg-red-900/20 focus:border-red-500 focus:ring-red-500/50'
                : 'border-gray-600 bg-gray-900 focus:border-blue-500 focus:ring-blue-500/50'
            }`}
          />

          <button
            onClick={validateCurrentKey}
            disabled={currentStatus === 'validating' || !getCurrentKey()}
            className="rounded-lg border border-blue-600 bg-blue-600/20 px-6 py-3 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {currentStatus === 'validating' ? (
              <>
                <span className="inline-block animate-spin mr-1">⏳</span>
                Testing...
              </>
            ) : currentStatus === 'valid' ? (
              <>✓ Valid</>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>

        {/* Help Link */}
        <div className="mt-2">
          <a
            href={providerInfo[aiProvider].link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 underline transition-colors hover:text-blue-300"
          >
            Get your API key here →
          </a>
        </div>

        {/* Error Message */}
        {currentError && (
          <div className="mt-3 rounded-lg border border-red-700 bg-red-900/20 p-3">
            <p className="text-sm text-red-200">
              ❌ <strong>Error:</strong> {currentError}
            </p>
          </div>
        )}

        {/* Success Message */}
        {currentStatus === 'valid' && (
          <div className="mt-3 rounded-lg border border-green-700 bg-green-900/20 p-3">
            <p className="text-sm text-green-200">
              ✓ <strong>Success:</strong> API key is valid and working.
            </p>
          </div>
        )}
      </div>

      {/* Whisk Token (Optional) */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 shadow">
        <label
          htmlFor="whisk-token"
          className="mb-2 block text-sm font-medium text-gray-300"
        >
          Google Whisk API Token <span className="text-gray-500">(Optional)</span>
        </label>

        <input
          id="whisk-token"
          type="password"
          value={whiskToken}
          onChange={(e) => setWhiskToken(e.target.value)}
          placeholder="ya29.a0..."
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-sm text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />

        <div className="mt-2 text-xs text-gray-500">
          Required for automated image generation.{' '}
          <a
            href="https://labs.google.com/whisk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline hover:text-blue-300"
          >
            How to get token →
          </a>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-blue-700 bg-blue-900/20 p-4">
        <p className="text-sm text-blue-200">
          💡 <strong>Tip:</strong> You can change these settings later in the application's
          Settings page.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between border-t border-gray-700 pt-6">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-600 bg-gray-700 px-6 py-2 text-sm text-white shadow-sm transition-colors hover:bg-gray-600"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          disabled={!isValidated}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next →
        </button>
      </div>

      {/* Blocked Message */}
      {!isValidated && currentStatus !== 'validating' && (
        <div className="rounded-lg border border-yellow-700 bg-yellow-900/20 p-4">
          <p className="text-sm text-yellow-200">
            ⚠️ Please test your API key before proceeding to the next step.
          </p>
        </div>
      )}
    </div>
  );
}
