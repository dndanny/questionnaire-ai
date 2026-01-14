import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/models';
import bcrypt from 'bcryptjs';
import { signSession, logout } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, password, name } = body;
    
    console.log(`Auth Request: ${action} for ${email}`); // Debug log

    await dbConnect();

    if (action === 'signup') {
      const hashed = await bcrypt.hash(password, 10);
      try {
        const user = await User.create({ email, password: hashed, name });
        await signSession({ id: user._id, email: user.email, name: user.name });
        return NextResponse.json({ success: true });
      } catch (e: any) {
        console.error("Signup DB Error:", e);
        if (e.code === 11000) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Database error: ' + e.message }, { status: 500 });
      }
    }

    if (action === 'login') {
      const user = await User.findOne({ email });
      if (!user) {
         return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
      
      await signSession({ id: user._id, email: user.email, name: user.name });
      return NextResponse.json({ success: true });
    }

    if (action === 'logout') {
      await logout();
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error("Auth General Error:", error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}