
// Increase timeout for DB operations
jest.setTimeout(30000);

// --- GLOBAL MOCKS FOR ENV VARS ---
// These must be set before imports run to prevent crashes in lib/db.ts and lib/gemini.ts
process.env.MONGODB_URI = 'mongodb://mock-uri-for-tests';
process.env.GEMINI_API_KEY = 'mock-gemini-key';
process.env.JWT_SECRET = 'mock-jwt-secret';
process.env.EMAIL_SENDER = 'mock@test.com';
process.env.NEXT_PUBLIC_URL = 'http://localhost';

// Suppress console errors during tests to keep output clean
// global.console.error = jest.fn();
