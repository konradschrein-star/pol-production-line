# Test Suite Documentation

Automated test suite for Obsidian News Desk production system.

## Test Structure

```
tests/
├── setup.ts                 # Global test setup
├── unit/                    # Unit tests (isolated component tests)
│   ├── reference-manager.test.ts
│   └── metrics-manager.test.ts
└── integration/             # Integration tests (API endpoints, database)
    └── api/
        ├── analytics.test.ts
        ├── style-presets.test.ts
        └── health.test.ts
```

## Running Tests

### All Tests
```bash
npm test                    # Run all tests once
npm run test:watch          # Watch mode (auto-rerun on file changes)
npm run test:ui             # Visual test UI (Vitest UI)
npm run test:coverage       # Run with coverage report
```

### Specific Test Suites
```bash
npm run test:unit           # Only unit tests
npm run test:integration    # Only integration tests
```

### Manual Integration Tests (Legacy)
```bash
npm run test:full           # Full end-to-end manual test
npm run test:simple         # Simple smoke test
npm run test:prod           # Production test
```

## Test Environment

Tests use `.env.test` for configuration:
- Separate test database (`obsidian_news_test`)
- Separate storage directory (`C:\Users\konra\ObsidianNewsDesk\test`)
- Mock or real API keys (configurable)

**IMPORTANT:** Integration tests require:
1. Running Next.js dev server (`npm run dev`)
2. Running Docker containers (Postgres + Redis)
3. Test database initialized (`npm run init-db`)

## Writing Tests

### Unit Tests

Use for testing isolated modules without external dependencies:

```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock external dependencies
vi.mock('@/lib/db');

describe('MyModule', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Integration Tests

Use for testing API endpoints, database queries, and multi-component interactions:

```typescript
import { describe, it, expect } from 'vitest';

describe('GET /api/endpoint', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';

  it('should return expected data', async () => {
    const response = await fetch(`${baseUrl}/api/endpoint`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('field');
  });
});
```

## Coverage Goals

Target coverage for production-ready code:
- **Unit tests:** 80%+ for critical business logic
- **Integration tests:** Cover all API endpoints
- **E2E tests:** Cover critical user workflows

Current coverage can be viewed by running:
```bash
npm run test:coverage
```

HTML coverage report will be generated in `coverage/` directory.

## CI/CD Integration

To run tests in CI/CD pipeline:

```yaml
# .github/workflows/test.yml example
- name: Run Tests
  run: |
    npm run test:unit         # Fast unit tests first
    npm run test:integration  # Integration tests if unit pass
```

## Troubleshooting

### Tests Failing to Connect
- Ensure `npm run dev` is running on port 8347
- Check Docker containers are up: `docker ps`
- Verify `.env.test` has correct connection strings

### Database Errors
- Initialize test database: `npm run init-db`
- Run migrations: `npm run migrate`

### Timeout Errors
- Integration tests have 30s timeout (configured in vitest.config.ts)
- Increase if needed for slow operations
