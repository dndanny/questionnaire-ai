import * as db from './db-handler';
import { POST as RoomAction } from '@/app/api/room/route';
import { POST as SubmitAction } from '@/app/api/submit/route';
import { User, Room, Submission } from '@/models';
import { getSession } from '@/lib/auth';

// Mocks
jest.mock('@/lib/db', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/email', () => ({ sendGradeEmail: jest.fn() }));
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

  // HELPER: Create user and mock session
  const setupHost = async () => {
      const u = await User.create({ 
          email: `host${Date.now()}@core.com`, 
          password: '123', 
          aiLimit: 100, 
          aiUsage: 0 
      });
      (getSession as jest.Mock).mockResolvedValue({ id: u._id });
      return u._id;
  };

  const req = (body: any) => new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });

  describe('Create Room', () => {
    it('Should block guest from creating room', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      const res = await RoomAction(req({ action: 'create', materials: [] }));
      expect(res.status).toBe(401);
    });

    it('Should create room with "Strict" mode', async () => {
      await setupHost();
      const res = await RoomAction(req({ 
          action: 'create', materials: [{type:'text',content:'a'}], 
          config: { gradingMode: 'strict' }, counts: { mc: 1 } 
      }));
      const json = await res.json();
      expect(res.status).toBe(200);
      
      const room = await Room.findById(json.roomId);
      expect(room.config.gradingMode).toBe('strict');
    });

    it('Should generate unique room codes each time', async () => {
      await setupHost();
      const res1 = await RoomAction(req({ action: 'create', materials: [{type:'text',content:'a'}], counts: { mc: 1 } }));
      const res2 = await RoomAction(req({ action: 'create', materials: [{type:'text',content:'a'}], counts: { mc: 1 } }));
      
      const json1 = await res1.json();
      const json2 = await res2.json();
      expect(json1.roomCode).not.toBe(json2.roomCode);
    });
  });

  describe('Submit Quiz', () => {
    let roomId: string;
    
    beforeEach(async () => {
        await setupHost(); // Ensure host exists to create room
        const room = await Room.create({ 
            code: 'TEST', 
            hostId: '507f1f77bcf86cd799439011',
            config: { markingType: 'batch' },
            quizData: { questions: [{ id: 'q1', question: 'Q' }] },
            materials: []
        });
        roomId = room._id.toString();
    });

    it('Should accept submission for Batch room', async () => {
      const res = await SubmitAction(req({ roomId, studentName: 'S', answers: { q1: 'A' } }));
      expect(res.status).toBe(200);
    });

    it('Should link submission to User if logged in', async () => {
      const userId = await setupHost(); // Log in as a student
      await SubmitAction(req({ roomId, studentName: 'Linked', answers: {} }));
      const sub = await Submission.findOne({ studentName: 'Linked' });
      expect(sub.studentId.toString()).toBe(userId.toString());
    });

    it('Should NOT link submission if guest', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      await SubmitAction(req({ roomId, studentName: 'Guest', answers: {} }));
      const sub = await Submission.findOne({ studentName: 'Guest' });
      expect(sub.studentId).toBeUndefined();
    });
  });
});