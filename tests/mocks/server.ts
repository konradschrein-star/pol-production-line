/**
 * MSW Server Configuration
 *
 * Sets up Mock Service Worker for API mocking in tests
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup server with default handlers
export const server = setupServer(...handlers);
