import { SecurityLog } from '@/models';

const BASE_LOCK_TIME = 100 * 1000; // 100 seconds
const ATTEMPTS_BEFORE_LOCK = 3;

export async function checkRateLimit(identifier: string, action: string) {
  const key = `${action}:${identifier}`;
  const log = await SecurityLog.findOne({ key });

  if (log && log.blockedUntil && new Date() < log.blockedUntil) {
    const timeLeft = Math.ceil((new Date(log.blockedUntil).getTime() - Date.now()) / 1000);
    throw new Error(`Too many attempts. Blocked for ${timeLeft} seconds.`);
  }
}

export async function recordFailure(identifier: string, action: string) {
  const key = `${action}:${identifier}`;
  let log = await SecurityLog.findOne({ key });

  if (!log) {
    log = await SecurityLog.create({ key });
  }

  log.failures += 1;

  // Check if we hit the threshold
  if (log.failures >= ATTEMPTS_BEFORE_LOCK) {
    // Multiplier logic: 3^0=1, 3^1=3, 3^2=9...
    // 1st lock: 100s. 2nd lock: 300s. 3rd lock: 900s.
    const multiplier = Math.pow(3, log.lockCount); 
    const lockDuration = BASE_LOCK_TIME * multiplier;
    
    log.blockedUntil = new Date(Date.now() + lockDuration);
    log.lockCount += 1; 
    log.failures = 0; // Reset failures so they get 3 more tries after waiting
  }

  await log.save();
}

export async function resetRateLimit(identifier: string, action: string) {
  const key = `${action}:${identifier}`;
  await SecurityLog.deleteOne({ key });
}