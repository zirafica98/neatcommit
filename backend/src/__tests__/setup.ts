/**
 * Jest Test Setup
 * 
 * Global test configuration
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-minimum-32-characters-long';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.GITHUB_APP_ID = '123456';
process.env.GITHUB_PRIVATE_KEY = '-----BEGIN RSA PRIVATE KEY-----\nMOCK_KEY\n-----END RSA PRIVATE KEY-----';
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.GITHUB_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.FRONTEND_URL = 'http://localhost:4200';
process.env.API_URL = 'http://localhost:3000';

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
