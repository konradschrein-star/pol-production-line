/**
 * Service Dependency Graph - Manages service start/stop ordering
 *
 * SIMPLIFIED 3-NODE ARCHITECTURE:
 * - docker: PostgreSQL + Redis containers (started together by docker-compose)
 * - nextjs: Next.js server (includes DB migrations on startup)
 * - workers: BullMQ workers
 *
 * Dependencies: workers → nextjs → docker
 * Start order: docker → nextjs → workers
 * Stop order: workers → nextjs → docker (reverse)
 *
 * PostgreSQL and Redis are NOT separate nodes - they're handled by docker-compose.yml
 * and started together when the docker service starts.
 */

import logger from '../logger';

export interface ServiceNode {
  depends: string[]; // List of service names this depends on
}

/**
 * ServiceGraph manages service dependencies and determines start/stop ordering
 */
export class ServiceGraph {
  private graph: Map<string, ServiceNode> = new Map();

  constructor(config: Record<string, ServiceNode>) {
    Object.entries(config).forEach(([service, node]) => {
      this.graph.set(service, node);
    });

    this.validate();
    logger.info(`Service graph initialized with ${this.graph.size} nodes`, 'service-graph');
  }

  /**
   * Validate graph for circular dependencies
   */
  private validate(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const deps = this.graph.get(node)?.depends || [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          throw new Error(`Circular dependency detected: ${node} → ${dep}`);
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of this.graph.keys()) {
      if (!visited.has(node)) {
        hasCycle(node);
      }
    }

    logger.debug('Service graph validated (no circular dependencies)', 'service-graph');
  }

  /**
   * Get service start order using topological sort (Kahn's algorithm)
   * Services with no dependencies start first
   */
  getStartOrder(): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Initialize in-degrees (count how many services depend on each service)
    for (const service of this.graph.keys()) {
      inDegree.set(service, 0);
    }

    // Count dependencies
    for (const [service, node] of this.graph.entries()) {
      for (const dep of node.depends) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    // Find nodes with no dependencies (in-degree 0)
    for (const [service, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(service);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const service = queue.shift()!;
      result.push(service);

      // For services that depend on this service, reduce their in-degree
      const deps = this.graph.get(service)?.depends || [];
      for (const dep of deps) {
        const newDegree = (inDegree.get(dep) || 0) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          queue.push(dep);
        }
      }
    }

    // Check if all services were processed (no cycles)
    if (result.length !== this.graph.size) {
      throw new Error('Failed to determine start order - possible circular dependency');
    }

    logger.debug(`Service start order: ${result.join(' → ')}`, 'service-graph');
    return result;
  }

  /**
   * Get service stop order (reverse of start order)
   * Services that started last should stop first
   */
  getStopOrder(): string[] {
    const startOrder = this.getStartOrder();
    const stopOrder = startOrder.reverse();
    logger.debug(`Service stop order: ${stopOrder.join(' → ')}`, 'service-graph');
    return stopOrder;
  }

  /**
   * Get dependencies for a specific service
   */
  getDependencies(service: string): string[] {
    return this.graph.get(service)?.depends || [];
  }

  /**
   * Get services that depend on the specified service
   */
  getDependents(service: string): string[] {
    const dependents: string[] = [];

    for (const [otherService, node] of this.graph.entries()) {
      if (node.depends.includes(service)) {
        dependents.push(otherService);
      }
    }

    return dependents;
  }

  /**
   * Check if a service exists in the graph
   */
  hasService(service: string): boolean {
    return this.graph.has(service);
  }

  /**
   * Get all service names
   */
  getAllServices(): string[] {
    return Array.from(this.graph.keys());
  }
}
