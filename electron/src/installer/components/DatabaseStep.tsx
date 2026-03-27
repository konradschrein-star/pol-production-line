import React from 'react';

export interface DatabaseStepProps {
  onValidate: (valid: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

type ServiceStatus = 'pending' | 'starting' | 'running' | 'error';

interface Service {
  name: string;
  description: string;
  status: ServiceStatus;
  error?: string;
}

/**
 * Database step - Verify Docker services are running
 *
 * This step automatically checks that PostgreSQL and Redis containers
 * are healthy before allowing the user to proceed.
 *
 * NOTE: No custom connection strings - Docker Compose handles this automatically
 */
export function DatabaseStep({ onValidate, onNext, onBack }: DatabaseStepProps) {
  const [services, setServices] = React.useState<Service[]>([
    {
      name: 'PostgreSQL',
      description: 'postgresql://localhost:5432/obsidian_news',
      status: 'pending',
    },
    {
      name: 'Redis',
      description: 'localhost:6379',
      status: 'pending',
    },
  ]);

  const [isChecking, setIsChecking] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  // Auto-check services on mount
  React.useEffect(() => {
    checkServices();
  }, []);

  const checkServices = async () => {
    setIsChecking(true);
    setGlobalError(null);

    // Update all services to "starting"
    setServices((prev) =>
      prev.map((service) => ({ ...service, status: 'starting' as ServiceStatus }))
    );

    try {
      // Wait for Docker services to be healthy
      await window.electronAPI.docker.waitForServices();

      // Get container status
      const status = await window.electronAPI.docker.getContainerStatus();

      // Update services based on status
      const updatedServices = services.map((service) => {
        const containerName =
          service.name === 'PostgreSQL' ? 'postgres' : 'redis';
        const containerStatus = status[containerName];

        if (containerStatus === 'running') {
          return { ...service, status: 'running' as ServiceStatus };
        } else {
          return {
            ...service,
            status: 'error' as ServiceStatus,
            error: `Container is ${containerStatus || 'not running'}`,
          };
        }
      });

      setServices(updatedServices);

      // Validate if all services are running
      const allRunning = updatedServices.every((s) => s.status === 'running');
      onValidate(allRunning);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to check services');
      setServices((prev) =>
        prev.map((service) => ({
          ...service,
          status: 'error' as ServiceStatus,
          error: err.message,
        }))
      );
      onValidate(false);
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case 'pending':
        return '○';
      case 'starting':
        return '⏳';
      case 'running':
        return '✓';
      case 'error':
        return '❌';
    }
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500 border-gray-500';
      case 'starting':
        return 'text-blue-400 border-blue-400';
      case 'running':
        return 'text-green-400 border-green-500';
      case 'error':
        return 'text-red-400 border-red-500';
    }
  };

  const allRunning = services.every((s) => s.status === 'running');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Database Services
        </h2>
        <p className="text-gray-400">
          Verifying that Docker containers are running. This may take a minute on first startup.
        </p>
      </div>

      {/* Services Status */}
      <div className="space-y-4">
        {services.map((service) => (
          <div
            key={service.name}
            className={`rounded-xl border p-6 shadow transition-all ${
              service.status === 'running'
                ? 'border-green-700 bg-green-900/20'
                : service.status === 'error'
                ? 'border-red-700 bg-red-900/20'
                : service.status === 'starting'
                ? 'border-blue-700 bg-blue-900/20'
                : 'border-gray-700 bg-gray-800/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-lg ${getStatusColor(
                      service.status
                    )}`}
                  >
                    {getStatusIcon(service.status)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {service.name}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-gray-400">
                      {service.description}
                    </p>
                  </div>
                </div>

                {/* Error Message */}
                {service.status === 'error' && service.error && (
                  <div className="mt-3 text-sm text-red-300">
                    Error: {service.error}
                  </div>
                )}

                {/* Status Text */}
                {service.status === 'starting' && (
                  <div className="mt-3 text-sm text-blue-300">
                    Starting container...
                  </div>
                )}

                {service.status === 'running' && (
                  <div className="mt-3 text-sm text-green-300">
                    Container is healthy and ready
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Retry Button (if errors) */}
      {!allRunning && !isChecking && (
        <button
          onClick={checkServices}
          className="w-full rounded-lg border border-blue-600 bg-blue-600/20 px-4 py-3 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-600/30"
        >
          Retry Service Check
        </button>
      )}

      {/* Global Error */}
      {globalError && (
        <div className="rounded-lg border border-red-700 bg-red-900/20 p-4">
          <p className="text-sm text-red-200">
            ❌ <strong>Error:</strong> {globalError}
          </p>
          <p className="mt-2 text-xs text-red-300">
            Make sure Docker Desktop is running and containers are started.
          </p>
        </div>
      )}

      {/* Success Message */}
      {allRunning && (
        <div className="rounded-lg border border-green-700 bg-green-900/20 p-4">
          <p className="text-sm text-green-200">
            ✓ <strong>Success:</strong> All database services are running and ready.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-blue-700 bg-blue-900/20 p-4">
        <p className="text-sm text-blue-200">
          💡 <strong>Note:</strong> These services are managed by Docker Compose.
          Connection strings are automatically configured.
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
          onClick={onNext}
          disabled={!allRunning}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next →
        </button>
      </div>

      {/* Loading Indicator */}
      {isChecking && (
        <div className="text-center">
          <p className="text-sm text-gray-400">
            <span className="inline-block animate-spin mr-2">⏳</span>
            Checking services...
          </p>
        </div>
      )}
    </div>
  );
}
