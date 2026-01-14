
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'default_secret_key');

export async function signSession(payload: any) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);
  
  (await cookies()).set('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  return token;
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, secretKey, { algorithms: ['HS256'] });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function logout() {
  (await cookies()).set('session', '', { expires: new Date(0) });
}
