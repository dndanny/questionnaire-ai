
import * as db from './db-handler';
import { POST } from '@/app/api/auth/action/route';
import { User } from '@/models';

// Mocks
jest.mock('@/lib/db', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/email', () => ({ sendVerificationEmail: jest.fn() }));
jest.mock('@/lib/auth', () => ({ signSession: jest.fn(), logout: jest.fn() }));

describe('Auth API Routes', () => {
  beforeAll(async () => await db.connect());
  afterEach(async () => await db.clearDatabase());
  afterAll(async () => await db.closeDatabase());

  const req = (body: any) => new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });

  describe('Sign Up', () => {
    it('21. Should sign up a new user successfully', async () => {
      const res = await POST(req({ action: 'signup', email: 'new@test.com', password: '123', name: 'New' }));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.verify).toBe(true);
    });

    it('22. Should create unverified user in DB on signup', async () => {
      await POST(req({ action: 'signup', email: 'check@test.com', password: '123' }));
      const user = await User.findOne({ email: 'check@test.com' });
      expect(user).toBeDefined();
      expect(user.isVerified).toBe(false);
    });

    it('23. Should fail if email already exists', async () => {
      await User.create({ email: 'exist@test.com', password: '123' });
      const res = await POST(req({ action: 'signup', email: 'exist@test.com', password: '123' }));
      expect(res.status).toBe(400);
    });

    it('24. Should set a verification code on signup', async () => {
      await POST(req({ action: 'signup', email: 'code@test.com', password: '123' }));
      const user = await User.findOne({ email: 'code@test.com' });
      expect(user.verificationCode).toHaveLength(6);
    });
  });

  describe('Login', () => {
    it('25. Should login successfully if verified', async () => {
      // Create hash manually or mock bcrypt? In integration test we rely on real bcrypt flow usually, 
      // but here we are using the API route which uses bcrypt.
      // So we must create user via API or manually hash. 
      // Faster: Create via API then manually verify.
      await POST(req({ action: 'signup', email: 'login@test.com', password: '123' }));
      await User.updateOne({ email: 'login@test.com' }, { isVerified: true });
      
      const res = await POST(req({ action: 'login', email: 'login@test.com', password: '123' }));
      expect(res.status).toBe(200);
    });

    it('26. Should fail login if password wrong', async () => {
      await POST(req({ action: 'signup', email: 'wrong@test.com', password: '123' }));
      await User.updateOne({ email: 'wrong@test.com' }, { isVerified: true });
      
      const res = await POST(req({ action: 'login', email: 'wrong@test.com', password: 'badpass' }));
      expect(res.status).toBe(401);
    });

    it('27. Should fail login if user does not exist', async () => {
      const res = await POST(req({ action: 'login', email: 'ghost@test.com', password: '123' }));
      expect(res.status).toBe(401); // Or 404 depending on implementation, usually 401 for security
    });

    it('28. Should block login if unverified', async () => {
      await POST(req({ action: 'signup', email: 'unverified@test.com', password: '123' }));
      // Do NOT verify
      const res = await POST(req({ action: 'login', email: 'unverified@test.com', password: '123' }));
      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.verify).toBe(true);
    });
  });

  describe('Verification', () => {
    it('29. Should verify with correct code', async () => {
      await POST(req({ action: 'signup', email: 'v@test.com', password: '123' }));
      const user = await User.findOne({ email: 'v@test.com' });
      
      const res = await POST(req({ action: 'verify', email: 'v@test.com', code: user.verificationCode }));
      expect(res.status).toBe(200);
      
      const verifiedUser = await User.findOne({ email: 'v@test.com' });
      expect(verifiedUser.isVerified).toBe(true);
    });

    it('30. Should fail with wrong code', async () => {
      await POST(req({ action: 'signup', email: 'badcode@test.com', password: '123' }));
      const res = await POST(req({ action: 'verify', email: 'badcode@test.com', code: '000000' }));
      expect(res.status).toBe(400);
    });

    it('31. Should fail if code expired', async () => {
      await POST(req({ action: 'signup', email: 'expire@test.com', password: '123' }));
      await User.updateOne({ email: 'expire@test.com' }, { verificationExpires: new Date(Date.now() - 10000) }); // Past
      const user = await User.findOne({ email: 'expire@test.com' });
      
      const res = await POST(req({ action: 'verify', email: 'expire@test.com', code: user.verificationCode }));
      expect(res.status).toBe(400);
    });
  });

  describe('Resend', () => {
    it('32. Should update verification code on resend', async () => {
      await POST(req({ action: 'signup', email: 'resend@test.com', password: '123' }));
      const user1 = await User.findOne({ email: 'resend@test.com' });
      const code1 = user1.verificationCode;

      await POST(req({ action: 'resend', email: 'resend@test.com' }));
      const user2 = await User.findOne({ email: 'resend@test.com' });
      
      expect(user2.verificationCode).not.toBe(code1);
    });

    it('33. Should extend expiry on resend', async () => {
        await POST(req({ action: 'signup', email: 'extend@test.com', password: '123' }));
        const user1 = await User.findOne({ email: 'extend@test.com' });
        
        // Wait 1ms (DB resolution might need more but let's assume update changes timestamp)
        await new Promise(r => setTimeout(r, 10));
        
        await POST(req({ action: 'resend', email: 'extend@test.com' }));
        const user2 = await User.findOne({ email: 'extend@test.com' });
        
        expect(new Date(user2.verificationExpires).getTime()).toBeGreaterThan(new Date(user1.verificationExpires).getTime());
    });
  });
});
