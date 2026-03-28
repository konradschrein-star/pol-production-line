# Testing Guide

This guide explains how to write and run tests for Obsidian News Desk.

## Test Infrastructure

### Tech Stack
- **Test Runner:** Vitest 1.3.0
- **React Testing:** @testing-library/react
- **API Mocking:** MSW (Mock Service Worker)
- **DOM Environment:** happy-dom
- **Coverage:** V8

## Running Tests

### Prerequisites

1. Create test database:
```bash
createdb obsidian_news_test
npm run init-db -- --database obsidian_news_test
```

2. Test environment variables are in `.env.test`

### Commands

```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # E2E tests (requires services)
npm run test:watch         # Watch mode
npm run test:coverage      # Generate coverage report
```

## Writing Tests

### API Tests

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { createTestJob, deleteTestJob } from '../../utils/db-helpers';

describe('POST /api/jobs', () => {
  let testJobId: string;

  afterEach(async () => {
    if (testJobId) await deleteTestJob(testJobId);
  });

  it('should create job', async () => {
    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_script: 'Test', title: 'Test Job' }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    testJobId = data.id;
  });
});
```

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should render and interact', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  expect(screen.getByText('Hello')).toBeInTheDocument();

  await user.click(screen.getByRole('button'));
  expect(screen.getByText('Clicked')).toBeInTheDocument();
});
```

## Best Practices

1. **Always cleanup after tests** - Use `afterEach`
2. **Use test database** - Never use production DB
3. **Mock external APIs only** - Let Next.js routes run for real
4. **Test behavior, not implementation**
5. **Use semantic queries** - `getByRole`, `getByLabelText`

## Troubleshooting

### Database connection failed
```bash
createdb obsidian_news_test
npm run init-db -- --database obsidian_news_test
```

### ECONNREFUSED (E2E tests)
```bash
# Start services first
START.bat
```

### Test timeouts
Increase timeout in test file:
```typescript
it('slow test', async () => { /* ... */ }, 180000); // 3 min
```

## Coverage Thresholds

- Lines: 70%
- Functions: 70%
- Branches: 65%
- Statements: 70%

View report: `npm run test:coverage` then open `coverage/index.html`
