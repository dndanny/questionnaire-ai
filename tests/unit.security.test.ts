/**
 * @file unit.security.test.ts
 * @description Security boundaries, input validation, and robust error handling.
 */

import * as db from './db-handler';
import { POST as RoomAction, DELETE as DeleteRoom } from '@/app/api/room/route';
import { POST as AdminAction, GET as AdminGet } from '@/app/api/admin/route';
import { User, Room } from '@/models';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';

// Mocks
jest.mock('@/lib/db', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/gemini', () => ({ generateQuiz: jest.fn() })); 
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

describe('Security & Edge Cases', () => {
  beforeAll(async () => await db.connect());
  afterEach(async () => {
      await db.clearDatabase();
      jest.clearAllMocks();
  });
  afterAll(async () => await db.closeDatabase());

  it('Refuses Room Creation for Unauthenticated Users', async () => {
    (getSession as jest.Mock).mockResolvedValue(null); 

    const req = new Request('http://localhost/api/room', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', materials: [] })
    });
    const res = await RoomAction(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/Unauthorized/i);
  });

  it('Prevents User A from Deleting User B\'s Room (IDOR Attack)', async () => {
    // Setup users
    const userA = await User.create({ email: 'a@test.com', password: '123', name: 'A' });
    const userB = await User.create({ email: 'b@test.com', password: '123', name: 'B' });

    // User A creates a room
    const roomA = await Room.create({ 
        hostId: userA._id, code: 'AAAAAA', isActive: true 
    });

    // ATTACK: User B tries to delete User A's room
    (getSession as jest.Mock).mockResolvedValue({ id: userB._id });

    const req = new Request(`http://localhost/api/room?id=${roomA._id}`, { method: 'DELETE' });
    const res = await DeleteRoom(req);
    
    expect(res.status).toBe(403); 
    
    const roomCheck = await Room.findById(roomA._id);
    expect(roomCheck).not.toBeNull();
  });

  it('Protects Admin Routes from Standard Users', async () => {
    const cookieStore: any = { get: jest.fn().mockReturnValue({ value: 'fake_token' }) };
    (cookies as any).mockReturnValue(cookieStore);

    const req = new Request('http://localhost/api/admin');
    const res = await AdminGet(req);
    
    expect(res.status).toBe(401); 
  });

  it('Handles extremely large payloads (DoS prevention attempt)', async () => {
    const hugeString = "a".repeat(1000000); // 1MB string
    
    // Create a real user so the AI Quota check (User.findById) passes
    const u = await User.create({ email: 'dos@test.com', password: '123', aiLimit: 100, aiUsage: 0 });
    (getSession as jest.Mock).mockResolvedValue({ id: u._id });

    const req = new Request('http://localhost/api/room', {
        method: 'POST',
        body: JSON.stringify({ 
            action: 'create', 
            materials: [{ type: 'text', content: hugeString }],
            counts: { mc: 5, short: 0, long: 0 }
        })
    });

    const res = await RoomAction(req);
    // Should return 200 (Success) or 500 (Mock error) but NOT crash the process
    expect(res).toBeDefined(); 
  });
});