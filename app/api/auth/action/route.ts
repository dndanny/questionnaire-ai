import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/models';
import bcrypt from 'bcryptjs';
import { signSession, logout } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, password, name, code } = body;
    
    await dbConnect();

    // --- SIGN UP (Generate Code, No Session) ---
    if (action === 'signup') {
        const exists = await User.findOne({ email });
        if (exists) return NextResponse.json({ error: 'Email already exists' }, { status: 400 });

        const hashed = await bcrypt.hash(password, 10);
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        await User.create({ 
            email, 
            password: hashed, 
            name,
            isVerified: false,
            verificationCode: verifyCode,
            verificationExpires: expires
        });

        await sendVerificationEmail(email, verifyCode);
        return NextResponse.json({ success: true, verify: true, email });
    }

    // --- VERIFY CODE ---
    if (action === 'verify') {
        const user = await User.findOne({ email });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        if (user.verificationCode !== code) {
            return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
        }
        if (new Date() > new Date(user.verificationExpires)) {
            return NextResponse.json({ error: 'Code expired. Please resend.' }, { status: 400 });
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationExpires = undefined;
        await user.save();

        await signSession({ id: user._id, email: user.email, name: user.name });
        return NextResponse.json({ success: true });
    }

    // --- RESEND CODE ---
    if (action === 'resend') {
        const user = await User.findOne({ email });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = verifyCode;
        user.verificationExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        await sendVerificationEmail(email, verifyCode);
        return NextResponse.json({ success: true });
    }

    // --- LOGIN ---
    if (action === 'login') {
        const user = await User.findOne({ email });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
        
        // Block unverified users
        if (!user.isVerified) {
            // Trigger a new code silently so they can verify now
            const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
            user.verificationCode = verifyCode;
            user.verificationExpires = new Date(Date.now() + 5 * 60 * 1000);
            await user.save();
            await sendVerificationEmail(email, verifyCode);
            
            return NextResponse.json({ error: 'Unverified', verify: true, email }, { status: 403 });
        }

        await signSession({ id: user._id, email: user.email, name: user.name });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}