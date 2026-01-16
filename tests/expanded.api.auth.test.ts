import * as db from './db-handler';
import { POST } from '@/app/api/auth/action/route';
import { User } from '@/models';

// Mocks
jest.mock('@/lib/db', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/email', () => ({ sendVerificationEmail: jest.fn() }));
jest.mock('@/lib/auth', () => ({ signSession: jest.fn(), logout: jest.fn() }));
// Mock Security limits to always pass
jest.mock('@/lib/security', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(true),
  recordFailure: jest.fn(),
  resetRateLimit: jest.fn()
}));

describe('Auth API Routes', () => {
  beforeAll(async () => await db.connect());
  afterEach(async () => await db.clearDatabase());
  afterAll(async () => await db.closeDatabase());

  const req = (body: any) => new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });

  describe('Sign Up', () => {
    it('Should sign up a new user successfully', async () => {
      const res = await POST(req({ action: 'signup', email: 'new@test.com', password: '123', name: 'New' }));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.verify).toBe(true);
    });

    it('Should set a verification code on signup', async () => {
      await POST(req({ action: 'signup', email: 'code@test.com', password: '123' }));
      const user = await User.findOne({ email: 'code@test.com' });
      expect(user.verificationCode).toHaveLength(6);
    });
  });

  describe('Login', () => {
    it('Should login successfully if verified', async () => {
      await POST(req({ action: 'signup', email: 'login@test.com', password: '123' }));
      await User.updateOne({ email: 'login@test.com' }, { isVerified: true });
      
      const res = await POST(req({ action: 'login', email: 'login@test.com', password: '123' }));
      expect(res.status).toBe(200);
    });

    it('Should block login if unverified', async () => {
      await POST(req({ action: 'signup', email: 'unverified@test.com', password: '123' }));
      const res = await POST(req({ action: 'login', email: 'unverified@test.com', password: '123' }));
      expect(res.status).toBe(403);
    });
  });

  describe('Verification', () => {
    it('Should verify with correct code', async () => {
      await POST(req({ action: 'signup', email: 'v@test.com', password: '123' }));
      
      // Fetch the generated code
      const user = await User.findOne({ email: 'v@test.com' });
      
      const res = await POST(req({ action: 'verify', email: 'v@test.com', code: user.verificationCode }));
      expect(res.status).toBe(200);
      
      const verifiedUser = await User.findOne({ email: 'v@test.com' });
      expect(verifiedUser.isVerified).toBe(true);
    });

    it('Should fail with wrong code', async () => {
      await POST(req({ action: 'signup', email: 'bad@test.com', password: '123' }));
      const res = await POST(req({ action: 'verify', email: 'bad@test.com', code: '000000' }));
      expect(res.status).toBe(400);
    });
  });

  describe('Resend', () => {
    it('Should update verification code on resend', async () => {
      await POST(req({ action: 'signup', email: 'resend@test.com', password: '123' }));
      const user1 = await User.findOne({ email: 'resend@test.com' });
      
      await POST(req({ action: 'resend', email: 'resend@test.com' }));
      const user2 = await User.findOne({ email: 'resend@test.com' });
      
      expect(user2.verificationCode).not.toBe(user1.verificationCode);
    });

    it('Should extend expiry on resend', async () => {
        await POST(req({ action: 'signup', email: 'extend@test.com', password: '123' }));
        // Manually set expiry to the past
        await User.updateOne({ email: 'extend@test.com' }, { verificationExpires: new Date(Date.now() - 10000) });
        
        await POST(req({ action: 'resend', email: 'extend@test.com' }));
        const user2 = await User.findOne({ email: 'extend@test.com' });
        
        expect(new Date(user2.verificationExpires).getTime()).toBeGreaterThan(Date.now());
    });
  });
});