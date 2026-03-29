'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface WhiskTokenRefreshWizardProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function WhiskTokenRefreshWizard({
  onClose,
  onSuccess,
}: WhiskTokenRefreshWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [newToken, setNewToken] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleTestToken = async () => {
    if (!newToken.trim()) {
      setErrorMessage('Please enter a token');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setErrorMessage('');

    try {
      // Test the token by making a simple API call
      const response = await fetch('/api/system/test-whisk-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: newToken.trim() }),
      });

      if (response.ok) {
        setTestResult('success');
        setCurrentStep(3);
      } else {
        const data = await response.json();
        setTestResult('error');
        setErrorMessage(data.error || 'Token validation failed');
      }
    } catch (error) {
      setTestResult('error');
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveToken = async () => {
    try {
      const response = await fetch('/api/system/update-whisk-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: newToken.trim() }),
      });

      if (response.ok) {
        onSuccess?.();
        onClose();
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Failed to save token');
      }
    } catch (error) {
      setErrorMessage('Failed to save token. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface_container border border-outline-variant rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Icon name="key" size="lg" className="text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-yellow-200">Refresh Whisk API Token</h2>
                <p className="text-sm text-gray-400 mt-1">Follow these steps to get a new token</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <Icon name="close" size="md" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex gap-4 mt-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex-1 flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    currentStep >= step
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface_container_low text-gray-500'
                  }`}
                >
                  {step}
                </div>
                <div className="flex-1">
                  <div
                    className={`h-1 rounded-full transition-colors ${
                      currentStep > step ? 'bg-primary' : 'bg-surface_container_low'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Instructions */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-gray-200">Step 1: Get Token from Whisk</h3>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300 font-medium mb-1">
                      Open Whisk in a new browser window
                    </p>
                    <a
                      href="https://labs.google.com/whisk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      https://labs.google.com/whisk
                      <Icon name="external-link" size="xs" />
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300 font-medium mb-1">
                      Open Browser Developer Tools
                    </p>
                    <p className="text-xs text-gray-500">Press F12 or right-click → Inspect</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300 font-medium mb-1">
                      Go to the Network tab
                    </p>
                    <div className="bg-surface_container_low rounded p-2 mt-2">
                      <img
                        src="/images/docs/network-tab.png"
                        alt="Network tab screenshot"
                        className="w-full rounded opacity-80"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300 font-medium mb-1">
                      Generate a test image on Whisk
                    </p>
                    <p className="text-xs text-gray-500">Upload any image and click "Remix"</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                    5
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300 font-medium mb-2">
                      Find the "generateImage" request
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      Filter by "generateImage" in the Network tab
                    </p>
                    <div className="bg-surface_container_low rounded-lg p-3 space-y-2">
                      <p className="text-xs text-gray-400">Click on the request, then:</p>
                      <ul className="text-xs text-gray-500 space-y-1 ml-4 list-disc">
                        <li>Go to "Headers" tab</li>
                        <li>Scroll to "Request Headers"</li>
                        <li>Find "Authorization: Bearer ya29.a0..."</li>
                        <li>Copy everything after "Bearer " (the token starts with "ya29")</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <Button variant="primary" size="md" onClick={() => setCurrentStep(2)} className="w-full">
                <Icon name="arrow-right" size="sm" />
                I Have the Token - Continue
              </Button>
            </div>
          )}

          {/* Step 2: Paste and Test Token */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-gray-200">Step 2: Paste and Test Token</h3>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Whisk API Token
                </label>
                <Input
                  type="password"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="ya29.a0ATkoCc..."
                  className="font-mono text-xs"
                />
                <p className="text-xs text-gray-500 mt-2">
                  The token should start with "ya29" and be several hundred characters long
                </p>
              </div>

              {testResult === 'error' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <Icon name="alert-circle" size="sm" />
                    <span className="text-sm font-medium">Token validation failed</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{errorMessage}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1"
                >
                  <Icon name="arrow-left" size="sm" />
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleTestToken}
                  disabled={!newToken.trim() || isTesting}
                  className="flex-1"
                >
                  {isTesting ? (
                    <>
                      <Icon name="refresh-cw" size="sm" className="animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Icon name="check" size="sm" />
                      Test Token
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Icon name="check-circle" size="xl" className="text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Token Validated!</h3>
                <p className="text-sm text-gray-400">
                  The token is valid and ready to be saved. Click "Save Token" to update your
                  environment.
                </p>
              </div>

              <div className="bg-surface_container_low rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="info" size="sm" className="text-blue-400" />
                  <span className="text-sm font-medium text-gray-300">Important Note</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Whisk tokens expire after approximately 1 hour. You'll need to repeat this
                  process when you see authentication errors. Consider setting up a reminder to
                  refresh the token periodically during long generation sessions.
                </p>
              </div>

              <Button variant="primary" size="md" onClick={handleSaveToken} className="w-full">
                <Icon name="save" size="sm" />
                Save Token and Continue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
