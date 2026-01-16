import { recordFailure, checkRateLimit, resetRateLimit } from '@/lib/security';
import * as db from './db-handler';
import { SecurityLog } from '@/models';

describe('Security Math & Logic', () => {
  beforeAll(async () => await db.connect());
  afterEach(async () => await db.clearDatabase());
  afterAll(async () => await db.closeDatabase());

  it('31. Base Case: 0 failures should not block', async () => {
    await expect(checkRateLimit('u1', 'login')).resolves.not.toThrow();
  });

  it('32. Threshold-1 failures should not block', async () => {
    await recordFailure('u2', 'login');
    await recordFailure('u2', 'login'); // 2 fails
    await expect(checkRateLimit('u2', 'login')).resolves.not.toThrow();
  });

  it('33. Threshold (3) failures should block', async () => {
    await recordFailure('u3', 'login');
    await recordFailure('u3', 'login');
    await recordFailure('u3', 'login');
    await expect(checkRateLimit('u3', 'login')).rejects.toThrow();
  });

  it('34. Reset should clear block immediately', async () => {
    await recordFailure('u4', 'login');
    await recordFailure('u4', 'login');
    await recordFailure('u4', 'login');
    await resetRateLimit('u4', 'login');
    await expect(checkRateLimit('u4', 'login')).resolves.not.toThrow();
  });

  it('35. Different actions should have separate counters', async () => {
    await recordFailure('u5', 'login');
    await recordFailure('u5', 'login');
    await recordFailure('u5', 'login'); // Login blocked
    
    // Reset password should be open
    await expect(checkRateLimit('u5', 'reset')).resolves.not.toThrow();
  });

  it('36. Different users should have separate counters', async () => {
    await recordFailure('A', 'login');
    await recordFailure('A', 'login');
    await recordFailure('A', 'login'); // A blocked
    
    await expect(checkRateLimit('B', 'login')).resolves.not.toThrow();
  });

  it('37. First lock duration calculation (approx 100s)', async () => {
    for(let i=0; i<3; i++) await recordFailure('math1', 'test');
    const log = await SecurityLog.findOne({ key: 'test:math1' });
    const diff = log.blockedUntil.getTime() - Date.now();
    
    // Allow slight execution time variance
    expect(diff).toBeGreaterThan(99000); 
    expect(diff).toBeLessThan(101000);
  });

  it('38. Second lock duration calculation (300s)', async () => {
    // Trip 1st lock
    for(let i=0; i<3; i++) await recordFailure('math2', 'test');
    
    // Manually expire it
    await SecurityLog.updateOne({ key: 'test:math2' }, { blockedUntil: new Date(Date.now() - 1000) });
    
    // Trip 2nd lock
    for(let i=0; i<3; i++) await recordFailure('math2', 'test');
    
    const log = await SecurityLog.findOne({ key: 'test:math2' });
    const diff = log.blockedUntil.getTime() - Date.now();
    
    // 100s * 3^1 = 300s
    expect(diff).toBeGreaterThan(299000);
    expect(diff).toBeLessThan(301000);
  });

  it('39. Third lock duration calculation (900s)', async () => {
    // 1st
    for(let i=0; i<3; i++) await recordFailure('math3', 'test');
    await SecurityLog.updateOne({ key: 'test:math3' }, { blockedUntil: new Date(Date.now() - 1000) });
    // 2nd
    for(let i=0; i<3; i++) await recordFailure('math3', 'test');
    await SecurityLog.updateOne({ key: 'test:math3' }, { blockedUntil: new Date(Date.now() - 1000) });
    // 3rd
    for(let i=0; i<3; i++) await recordFailure('math3', 'test');
    
    const log = await SecurityLog.findOne({ key: 'test:math3' });
    const diff = log.blockedUntil.getTime() - Date.now();
    
    // 100s * 3^2 = 900s
    expect(diff).toBeGreaterThan(899000);
    expect(diff).toBeLessThan(901000);
  });

  it('40. Database Persistence Check', async () => {
    await recordFailure('db', 'persist');
    const logs = await SecurityLog.find();
    expect(logs.length).toBeGreaterThan(0);
  });
});