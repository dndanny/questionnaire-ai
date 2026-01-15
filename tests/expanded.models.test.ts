
import * as db from './db-handler';
import { User, Room, Submission } from '@/models';

describe('Expanded Data Model Tests', () => {
  beforeAll(async () => await db.connect());
  afterEach(async () => await db.clearDatabase());
  afterAll(async () => await db.closeDatabase());

  // --- USER TESTS ---
  describe('User Model', () => {
    it('1. Should accept a valid user', async () => {
      const u = await User.create({ email: 'valid@test.com', password: 'pw', name: 'Valid' });
      expect(u.email).toBe('valid@test.com');
    });

    it('2. Should default isVerified to false', async () => {
      const u = await User.create({ email: 'def@test.com', password: 'pw' });
      expect(u.isVerified).toBe(false);
    });

    it('3. Should enforce unique emails', async () => {
      await User.create({ email: 'u@test.com', password: 'pw' });
      await expect(User.create({ email: 'u@test.com', password: 'pw2' })).rejects.toThrow();
    });

    it('4. Should require a password', async () => {
      const u = new User({ email: 'nopw@test.com' });
      await expect(u.save()).rejects.toThrow();
    });

    it('5. Should require an email', async () => {
      const u = new User({ password: 'pw' });
      await expect(u.save()).rejects.toThrow();
    });

    it('6. Should store verification codes', async () => {
      const u = await User.create({ email: 'code@test.com', password: 'pw', verificationCode: '123456' });
      expect(u.verificationCode).toBe('123456');
    });

    it('7. Should store verification expiry dates', async () => {
      const date = new Date();
      const u = await User.create({ email: 'time@test.com', password: 'pw', verificationExpires: date });
      expect(u.verificationExpires).toEqual(date);
    });
  });

  // --- ROOM TESTS ---
  describe('Room Model', () => {
    it('8. Should create a room with minimal required fields', async () => {
      const r = await Room.create({ code: 'ABC', hostId: '507f1f77bcf86cd799439011' });
      expect(r.code).toBe('ABC');
    });

    it('9. Should default isActive to true', async () => {
      const r = await Room.create({ code: 'ACTIVE', hostId: '507f1f77bcf86cd799439011' });
      expect(r.isActive).toBe(true);
    });

    it('10. Should store string array for materials', async () => {
      const r = await Room.create({ code: 'MATS', hostId: '507f1f77bcf86cd799439011', materials: ['A', 'B'] });
      expect(r.materials).toHaveLength(2);
    });

    it('11. Should store quizData as an object', async () => {
      const data = { title: 'Test', questions: [] };
      const r = await Room.create({ code: 'JSON', hostId: '507f1f77bcf86cd799439011', quizData: data });
      expect(r.quizData.title).toBe('Test');
    });

    it('12. Should store config with defaults', async () => {
      const r = await Room.create({ 
        code: 'CONF', 
        hostId: '507f1f77bcf86cd799439011', 
        config: { questionTypes: ['MC'] } // counts is optional in schema definition if not strict
      });
      expect(r.config.questionTypes[0]).toBe('MC');
    });

    it('13. Should enforce unique room codes', async () => {
      await Room.create({ code: 'UNIQUE', hostId: '507f1f77bcf86cd799439011' });
      await expect(Room.create({ code: 'UNIQUE', hostId: '507f1f77bcf86cd799439011' })).rejects.toThrow();
    });

    it('14. Should allow linking to a valid Host User', async () => {
      const host = await User.create({ email: 'h@t.com', password: 'p' });
      const r = await Room.create({ code: 'LINK', hostId: host._id });
      const found = await Room.findOne({ code: 'LINK' }).populate('hostId');
      expect(found.hostId.email).toBe('h@t.com');
    });
  });

  // --- SUBMISSION TESTS ---
  describe('Submission Model', () => {
    it('15. Should create a submission linked to a room', async () => {
      const room = await Room.create({ code: 'SUB', hostId: '507f1f77bcf86cd799439011' });
      const sub = await Submission.create({ roomId: room._id, studentName: 'Stu' });
      expect(sub.roomId).toEqual(room._id);
    });

    it('16. Should default status to "pending"', async () => {
      const sub = await Submission.create({ studentName: 'Pending' });
      expect(sub.status).toBe('pending');
    });

    it('17. Should store answers map', async () => {
      const sub = await Submission.create({ studentName: 'Ans', answers: { q1: 'A' } });
      expect(sub.answers.q1).toBe('A');
    });

    it('18. Should store grades map', async () => {
      const sub = await Submission.create({ studentName: 'Grade', grades: { q1: { score: 10 } } });
      expect(sub.grades.q1.score).toBe(10);
    });

    it('19. Should default totalScore to 0', async () => {
      const sub = await Submission.create({ studentName: 'Zero' });
      expect(sub.totalScore).toBe(0);
    });

    it('20. Should allow linking to a registered student user', async () => {
      const user = await User.create({ email: 's@t.com', password: 'p' });
      const sub = await Submission.create({ studentName: 'Linked', studentId: user._id });
      expect(sub.studentId).toEqual(user._id);
    });
  });
});
