import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file from project root
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

console.log('🔧 Environment variables loaded from:', envPath);
console.log('   - NODE_ENV:', process.env.NODE_ENV);
console.log('   - REDIS_HOST:', process.env.REDIS_HOST);
console.log('   - REDIS_PORT:', process.env.REDIS_PORT);
console.log('   - AI_PROVIDER:', process.env.AI_PROVIDER);
