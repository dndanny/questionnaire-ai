/**
 * @file integration.flow.test.ts
 * @description End-to-End Integration Test (Updated for Rate Limiting & Quotas)
 */

import * as db from './db-handler';
import { POST as AuthAction } from '@/app/api/auth/action/route';
import { POST as RoomAction } from '@/app/api/room/route';
import { POST as SubmitAction } from '@/app/api/submit/route';
import { User, Submission } from '@/models';

// --- MOCKS ---

// 1. Mock DB Connection (prevent multi-connection error)
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true)
}));

// 2. Mock Security/Rate Limiting (Bypass for tests)
jest.mock('@/lib/security', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(true),
  recordFailure: jest.fn(),
  resetRateLimit: jest.fn()
}));

// 3. Mock AI (Deterministic results)
jest.mock('@/lib/gemini', () => ({
  generateQuiz: jest.fn().mockResolvedValue({
    title: "Integration Test Quiz",
    questions: [
      { id: "q1", type: "MC", question: "Is this a test?", options: ["Yes", "No"], modelAnswer: "Yes" },
      { id: "q2", type: "Short", question: "Explain testing.", modelAnswer: "Verifying code." }
    ]
  }),
  gradeSubmission: jest.fn().mockResolvedValue({ score: 10, feedback: "Perfect execution." }),
}));

// 4. Mock Email
jest.mock('@/lib/email', () => ({
  sendVerificationEmail: jest.fn(),
  sendGradeEmail: jest.fn()
}));

// 5. Mock Session
jest.mock('@/lib/auth', () => {
    return {
        signSession: jest.fn(),
        getSession: jest.fn(),
        logout: jest.fn()
    };
});
import { getSession } from '@/lib/auth';

describe('E2E Critical User Journey', () => {
  beforeAll(async () => await db.connect());
  afterEach(async () => {
      await db.clearDatabase();
      jest.clearAllMocks();
  });
  afterAll(async () => await db.closeDatabase());

  it('should allow a complete lifecycle: Host Sign Up -> Create Room -> Student Submit', async () => {
    
    // 1. HOST REGISTRATION
    const signupReq = new Request('http://localhost/api/auth/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'signup', email: 'host@test.com', password: 'Password123!', name: 'Mr. Host' })
    });
    const signupRes = await AuthAction(signupReq);
    const signupJson = await signupRes.json();
    
    expect(signupRes.status).toBe(200);
    expect(signupJson.verify).toBe(true); 

    // Manually verify user in DB AND Set AI Quotas
    const hostUser = await User.findOneAndUpdate(
        { email: 'host@test.com' }, 
        { 
            isVerified: true,
            aiLimit: 100, // Ensure they have quota
            aiUsage: 0
        }, 
        { new: true }
    );
    expect(hostUser).toBeDefined();

    // 2. MOCK LOGIN SESSION
    (getSession as jest.Mock).mockResolvedValue({ id: hostUser._id, email: hostUser.email, name: hostUser.name });

    // 3. CREATE ROOM
    const createReq = new Request('http://localhost/api/room', {
        method: 'POST',
        body: JSON.stringify({
            action: 'create',
            materials: [{ type: 'text', content: 'Physics laws.' }],
            counts: { mc: 1, short: 1, long: 0 },
            config: { gradingMode: 'strict', markingType: 'instant' } 
        })
    });
    const createRes = await RoomAction(createReq);
    const roomJson = await createRes.json();

    if (createRes.status !== 200) console.error("Room Create Failed:", roomJson);
    expect(createRes.status).toBe(200);
    expect(roomJson.roomCode).toBeDefined();
    
    const roomId = roomJson.roomId;

    // 4. STUDENT SUBMISSION (Guest)
    (getSession as jest.Mock).mockResolvedValue(null);

    const submitReq = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({
            roomId: roomId,
            studentName: "Student A",
            studentEmail: "student@school.edu",
            answers: {
                "q1": "Yes",
                "q2": "Testing ensures quality."
            }
        })
    });
    const submitRes = await SubmitAction(submitReq);
    const submitJson = await submitRes.json();

    // 5. VALIDATE RESULTS
    expect(submitRes.status).toBe(200);
    expect(submitJson.status).toBe('graded'); 
    
    const subInDb = await Submission.findOne({ studentEmail: "student@school.edu" });
    expect(subInDb).toBeDefined();
    expect(subInDb.totalScore).toBe(20); 
  });
});