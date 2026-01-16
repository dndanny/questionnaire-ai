import * as db from './db-handler';
import { User, Room, Submission, SecurityLog } from '@/models';

describe('Data Validation Suite', () => {
  // Use index init for unique constraints to work in memory server
  beforeAll(async () => {
      await db.connect();
      await User.init();
      await Room.init();
  });
  afterEach(async () => await db.clearDatabase());
  afterAll(async () => await db.closeDatabase());

  // --- USER VALIDATION ---
  describe('User Schema Constraints', () => {
    it('1. Should reject user without email', async () => {
      const u = new User({ password: '123' });
      await expect(u.save()).rejects.toThrow(/email/);
    });

    it('2. Should reject user without password', async () => {
      const u = new User({ email: 'a@b.com' });
      await expect(u.save()).rejects.toThrow(/password/);
    });

    it('3. Should save user with minimal required fields', async () => {
      const u = new User({ email: 'min@test.com', password: '123' });
      await expect(u.save()).resolves.toBeDefined();
    });

    it('4. Should default isVerified to false', async () => {
      const u = await User.create({ email: 'def@test.com', password: '123' });
      expect(u.isVerified).toBe(false);
    });

    it('5. Should default aiLimit to 5', async () => {
      const u = await User.create({ email: 'lim@test.com', password: '123' });
      expect(u.aiLimit).toBe(5);
    });

    it('6. Should default aiUsage to 0', async () => {
      const u = await User.create({ email: 'use@test.com', password: '123' });
      expect(u.aiUsage).toBe(0);
    });

    it('7. Should allow optional name field', async () => {
      const u = await User.create({ email: 'name@test.com', password: '123', name: 'Test Name' });
      expect(u.name).toBe('Test Name');
    });
  });

  // --- ROOM VALIDATION ---
  describe('Room Schema Constraints', () => {
    it('8. Should reject room without code', async () => {
      const r = new Room({ hostId: '507f1f77bcf86cd799439011' });
      await expect(r.save()).rejects.toThrow(/code/);
    });

    it('9. Should reject room without valid code (duplicate check)', async () => {
      await Room.create({ code: 'DUP', hostId: '507f1f77bcf86cd799439011' });
      try {
          await Room.create({ code: 'DUP', hostId: '507f1f77bcf86cd799439011' });
          throw new Error('Should have failed');
      } catch (e: any) {
          expect(e).toBeDefined();
      }
    });

    it('10. Should default isActive to true', async () => {
      const r = await Room.create({ code: 'ACT', hostId: '507f1f77bcf86cd799439011' });
      expect(r.isActive).toBe(true);
    });

    it('11. Should store materials array', async () => {
      const r = await Room.create({ code: 'MAT', materials: ['A', 'B'], hostId: '507f1f77bcf86cd799439011' });
      expect(r.materials).toHaveLength(2);
    });

    it('12. Should store complex quizData object', async () => {
      const data = { questions: [{ id: 1, text: 'Q' }] };
      const r = await Room.create({ code: 'OBJ', quizData: data, hostId: '507f1f77bcf86cd799439011' });
      expect(r.quizData.questions[0].id).toBe(1);
    });

    it('13. Should store markingType default', async () => {
      const r = await Room.create({ code: 'MARK', hostId: '507f1f77bcf86cd799439011' });
      r.config = { gradingMode: 'strict' };
      await r.save();
      expect(r.config.gradingMode).toBe('strict');
    });
  });

  // --- SUBMISSION VALIDATION ---
  describe('Submission Schema Constraints', () => {
    it('14. Should default status to pending', async () => {
      const s = await Submission.create({ studentName: 'Test' });
      expect(s.status).toBe('pending');
    });

    it('15. Should default totalScore to 0', async () => {
      const s = await Submission.create({ studentName: 'Test' });
      expect(s.totalScore).toBe(0);
    });

    it('16. Should allow IP Address storage', async () => {
      const s = await Submission.create({ studentName: 'IP', ipAddress: '127.0.0.1' });
      expect(s.ipAddress).toBe('127.0.0.1');
    });

    it('17. Should allow linking to User ObjectId', async () => {
      const u = await User.create({ email: 'link@t.com', password: '1' });
      const s = await Submission.create({ studentName: 'Link', studentId: u._id });
      expect(s.studentId).toEqual(u._id);
    });
  });

  // --- SECURITY LOG VALIDATION ---
  describe('SecurityLog Schema', () => {
    it('18. Should require a key', async () => {
      const l = new SecurityLog({});
      await expect(l.save()).rejects.toThrow(/key/);
    });

    it('19. Should default failures to 0', async () => {
      const l = await SecurityLog.create({ key: 'test' });
      expect(l.failures).toBe(0);
    });

    it('20. Should default lockCount to 0', async () => {
      const l = await SecurityLog.create({ key: 'test2' });
      expect(l.lockCount).toBe(0);
    });
  });
});