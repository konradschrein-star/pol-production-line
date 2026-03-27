/**
 * Simple test worker for portable Node.js integration test
 *
 * This script is spawned by test-portable-node.ts to verify:
 * - TypeScript execution via tsx
 * - Environment variable access
 * - Node.js version detection
 */

// Print Node.js version
console.log(`Node.js version: ${process.version}`);

// Print environment variable
const testVar = process.env.TEST_VAR;
console.log(`Environment variable TEST_VAR: ${testVar}`);

// Exit successfully
process.exit(0);
