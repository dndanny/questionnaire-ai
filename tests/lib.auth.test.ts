
import { signSession, getSession } from '@/lib/auth';
import { cookies } from 'next/headers';

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('Authentication Library (JWT)', () => {
  const mockCookieStore: any = {
    set: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => {
    (cookies as any).mockReturnValue(Promise.resolve(mockCookieStore));
    jest.clearAllMocks();
  });

  it('should sign a session and set a cookie', async () => {
    const payload = { id: '123', email: 'test@test.com' };
    const token = await signSession(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({ httpOnly: true })
    );
  });

  it('should return null if no session cookie exists', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const session = await getSession();
    expect(session).toBeNull();
  });
});
