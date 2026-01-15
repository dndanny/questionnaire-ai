
/**
 * @file integration.flow.test.ts
 * @description End-to-End Integration Test for the Core User Journey.
 * Simulates: Auth -> Room Creation -> Student Join -> Submission -> Grading.
 */

import * as db from './db-handler';
import { POST as AuthAction } from '@/app/api/auth/action/route';
import { POST as RoomAction } from '@/app/api/room/route';
import { POST as SubmitAction } from '@/app/api/submit/route';
import { User, Room, Submission } from '@/models';
import { signSession } from '@/lib/auth';

// --- MOCKS ---
// We mock the AI to return deterministic results so we don't pay for API calls during testing
jest.mock('@/lib/gemini', () => ({
  generateQuiz: jest.fn().mockResolvedValue({
    title: "Integration Test Quiz",
    questions: [
      { id: "q1", type: "MC", question: "Is this a test?", options: ["Yes", "No"], modelAnswer: "Yes" },
      { id: "q2", type: "Short", question: "Explain testing.", modelAnswer: "Verifying code." }
    ]
  }),
  gradeSubmission: jest.fn().mockResolvedValue({ score: 10, feedback: "Perfect execution." }),
  gradeWholeBatch: jest.fn().mockResolvedValue({
      "user_sub_id": {
          "q1": { score: 10, feedback: "Correct" },
          "q2": { score: 5, feedback: "Okay" }
      }
  })
}));

// Mock Email to prevent spam
jest.mock('@/lib/email', () => ({
  sendVerificationEmail: jest.fn(),
  sendGradeEmail: jest.fn()
}));

// Mock Session (we will manually inject session cookies in the logic or mock the helper)
jest.mock('@/lib/auth', () => {
    const original = jest.requireActual('@/lib/auth');
    return {
        ...original,
        getSession: jest.fn() // We will override this per test
    };
});
import { getSession } from '@/lib/auth';

// MOCK DB CONNECTION to prevent "Multiple Connections" error
// The test runner already connects to MongoMemoryServer, so the API route should assume it's connected.
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true)
}));

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
    expect(signupJson.verify).toBe(true); // Should require verification

    // Manually verify user in DB (skipping the OTP step for speed in this integration test)
    const hostUser = await User.findOneAndUpdate({ email: 'host@test.com' }, { isVerified: true }, { new: true });
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
            config: { gradingMode: 'strict', markingType: 'instant' } // Instant grading for this test
        })
    });
    const createRes = await RoomAction(createReq);
    const roomJson = await createRes.json();

    expect(createRes.status).toBe(200);
    expect(roomJson.roomCode).toBeDefined();
    
    const roomId = roomJson.roomId;

    // 4. STUDENT SUBMISSION (Guest)
    // We clear the session mock to simulate a guest student
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
    expect(submitJson.status).toBe('graded'); // Instant grading was on
    expect(submitJson.totalScore).toBeGreaterThan(0); // AI mock returned 10 per question
    
    // Check DB
    const subInDb = await Submission.findOne({ studentEmail: "student@school.edu" });
    expect(subInDb).toBeDefined();
    expect(subInDb.totalScore).toBe(20); // 2 questions * 10 points mock
  });
});
