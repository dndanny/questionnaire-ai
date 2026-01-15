
import * as db from './db-handler';
import { POST as RoomAction } from '@/app/api/room/route';
import { POST as SubmitAction } from '@/app/api/submit/route';
import { User, Room, Submission } from '@/models';
import { getSession } from '@/lib/auth';

// Mocks
jest.mock('@/lib/db', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/email', () => ({ sendGradeEmail: jest.fn() }));
// Deterministic AI Mock
jest.mock('@/lib/gemini', () => ({
  generateQuiz: jest.fn().mockResolvedValue({ 
      title: "Test", 
      questions: [{ id: "q1", type: "MC", question: "Q?", options: ["A"], modelAnswer: "A" }] 
  }),
  gradeSubmission: jest.fn().mockResolvedValue({ score: 10, feedback: "Good" }),
}));

describe('Core API (Room & Submit)', () => {
  beforeAll(async () => await db.connect());
  afterEach(async () => {
      await db.clearDatabase();
      jest.clearAllMocks();
  });
  afterAll(async () => await db.closeDatabase());

  const req = (body: any) => new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });

  // --- ROOM CREATION ---
  describe('Create Room', () => {
    it('34. Should block guest from creating room', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      const res = await RoomAction(req({ action: 'create', materials: [] }));
      expect(res.status).toBe(401);
    });

    it('35. Should create room with "Strict" mode', async () => {
      (getSession as jest.Mock).mockResolvedValue({ id: '507f1f77bcf86cd799439011' });
      const res = await RoomAction(req({ 
          action: 'create', materials: [{type:'text',content:'a'}], 
          config: { gradingMode: 'strict' }, counts: { mc: 1 } 
      }));
      const json = await res.json();
      expect(res.status).toBe(200);
      
      const room = await Room.findById(json.roomId);
      expect(room.config.gradingMode).toBe('strict');
    });

    it('36. Should create room with "Open" mode', async () => {
      (getSession as jest.Mock).mockResolvedValue({ id: '507f1f77bcf86cd799439011' });
      const res = await RoomAction(req({ 
          action: 'create', materials: [{type:'text',content:'a'}], 
          config: { gradingMode: 'open' }, counts: { mc: 1 } 
      }));
      const json = await res.json();
      const room = await Room.findById(json.roomId);
      expect(room.config.gradingMode).toBe('open');
    });

    it('37. Should create room with "Batch" marking', async () => {
      (getSession as jest.Mock).mockResolvedValue({ id: '507f1f77bcf86cd799439011' });
      const res = await RoomAction(req({ 
          action: 'create', materials: [{type:'text',content:'a'}], 
          config: { markingType: 'batch' }, counts: { mc: 1 } 
      }));
      const json = await res.json();
      const room = await Room.findById(json.roomId);
      expect(room.config.markingType).toBe('batch');
    });

    it('38. Should create room with "Instant" marking', async () => {
      (getSession as jest.Mock).mockResolvedValue({ id: '507f1f77bcf86cd799439011' });
      const res = await RoomAction(req({ 
          action: 'create', materials: [{type:'text',content:'a'}], 
          config: { markingType: 'instant' }, counts: { mc: 1 } 
      }));
      const json = await res.json();
      const room = await Room.findById(json.roomId);
      expect(room.config.markingType).toBe('instant');
    });

    it('39. Should generate unique room codes each time', async () => {
      (getSession as jest.Mock).mockResolvedValue({ id: '507f1f77bcf86cd799439011' });
      const res1 = await RoomAction(req({ action: 'create', materials: [{type:'text',content:'a'}], counts: { mc: 1 } }));
      const res2 = await RoomAction(req({ action: 'create', materials: [{type:'text',content:'a'}], counts: { mc: 1 } }));
      
      const json1 = await res1.json();
      const json2 = await res2.json();
      expect(json1.roomCode).not.toBe(json2.roomCode);
    });
  });

  // --- JOINING ---
  describe('Join Room', () => {
    it('40. Should return roomId for valid code', async () => {
      const room = await Room.create({ code: 'VALID1', isActive: true });
      const res = await RoomAction(req({ action: 'join', code: 'VALID1' }));
      const json = await res.json();
      expect(json.roomId).toBe(room._id.toString());
    });

    it('41. Should ignore case sensitivity', async () => {
      await Room.create({ code: 'UPPER', isActive: true });
      const res = await RoomAction(req({ action: 'join', code: 'upper' }));
      expect(res.status).toBe(200);
    });

    it('42. Should ignore whitespace', async () => {
      await Room.create({ code: 'SPACE', isActive: true });
      const res = await RoomAction(req({ action: 'join', code: ' SPACE ' }));
      expect(res.status).toBe(200);
    });

    it('43. Should fail for invalid code', async () => {
      const res = await RoomAction(req({ action: 'join', code: 'WRONG' }));
      expect(res.status).toBe(404);
    });
  });

  // --- SUBMISSION & GRADING ---
  describe('Submit Quiz', () => {
    let roomId: string;
    
    beforeEach(async () => {
        const room = await Room.create({ 
            code: 'TEST', 
            hostId: '507f1f77bcf86cd799439011',
            config: { markingType: 'batch' },
            quizData: { questions: [{ id: 'q1', question: 'Q' }] },
            materials: []
        });
        roomId = room._id.toString();
    });

    it('44. Should accept submission for Batch room', async () => {
      const res = await SubmitAction(req({ roomId, studentName: 'S', answers: { q1: 'A' } }));
      expect(res.status).toBe(200);
    });

    it('45. Should set status to "pending" for Batch', async () => {
      const res = await SubmitAction(req({ roomId, studentName: 'S', answers: { q1: 'A' } }));
      const json = await res.json();
      expect(json.status).toBe('pending');
    });

    it('46. Should save submission to DB', async () => {
      await SubmitAction(req({ roomId, studentName: 'Saved', answers: { q1: 'A' } }));
      const sub = await Submission.findOne({ studentName: 'Saved' });
      expect(sub).toBeDefined();
    });

    it('47. Should link submission to User if logged in', async () => {
      (getSession as jest.Mock).mockResolvedValue({ id: '507f1f77bcf86cd799439011' }); // Student User ID
      await SubmitAction(req({ roomId, studentName: 'Linked', answers: {} }));
      const sub = await Submission.findOne({ studentName: 'Linked' });
      expect(sub.studentId.toString()).toBe('507f1f77bcf86cd799439011');
    });

    it('48. Should NOT link submission if guest', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      await SubmitAction(req({ roomId, studentName: 'Guest', answers: {} }));
      const sub = await Submission.findOne({ studentName: 'Guest' });
      expect(sub.studentId).toBeUndefined();
    });

    it('49. Should grade immediately if room is Instant', async () => {
      // Create Instant Room
      const instantRoom = await Room.create({ 
          code: 'INST', 
          config: { markingType: 'instant' },
          quizData: { questions: [{ id: 'q1', question: 'Q' }] },
          materials: []
      });
      
      const res = await SubmitAction(req({ roomId: instantRoom._id, studentName: 'Fast', answers: { q1: 'A' } }));
      const json = await res.json();
      
      expect(json.status).toBe('graded');
      expect(json.totalScore).toBe(10); // Mock returns 10
    });

    it('50. Should capture Student Email', async () => {
      await SubmitAction(req({ roomId, studentName: 'Mail', studentEmail: 'me@test.com', answers: {} }));
      const sub = await Submission.findOne({ studentName: 'Mail' });
      expect(sub.studentEmail).toBe('me@test.com');
    });
  });
});
