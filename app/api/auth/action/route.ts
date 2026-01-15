import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/models';
import bcrypt from 'bcryptjs';
import { signSession, logout } from '@/lib/auth';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, password, name, code, newPassword } = body;
    
    await dbConnect();

    // --- SIGN UP ---
    if (action === 'signup') {
        const exists = await User.findOne({ email });
        if (exists) return NextResponse.json({ error: 'Email already exists' }, { status: 400 });

        const hashed = await bcrypt.hash(password, 10);
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 5 * 60 * 1000); 

        await User.create({ email, password: hashed, name, isVerified: false, verificationCode: verifyCode, verificationExpires: expires });
        await sendVerificationEmail(email, verifyCode);
        return NextResponse.json({ success: true, verify: true, email });
    }

    // --- VERIFY ACCOUNT ---
    if (action === 'verify') {
        const user = await User.findOne({ email });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (user.verificationCode !== code) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
        if (new Date() > new Date(user.verificationExpires)) return NextResponse.json({ error: 'Code expired' }, { status: 400 });

        user.isVerified = true;
        user.verificationCode = undefined;
        await user.save();
        await signSession({ id: user._id, email: user.email, name: user.name });
        return NextResponse.json({ success: true });
    }

    // --- RESEND VERIFICATION ---
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
        if (!user || !await bcrypt.compare(password, user.password)) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        
        if (!user.isVerified) {
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

    // --- FORGOT PASSWORD REQUEST ---
    if (action === 'forgot-password') {
        const user = await User.findOne({ email });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        
        // Only Verified users can reset
        if (!user.isVerified) return NextResponse.json({ error: 'Account not verified. Please login to verify first.' }, { status: 403 });

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Reusing verification fields for simplicity, acts as a temporary OTP
        user.verificationCode = resetCode;
        user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await user.save();

        await sendPasswordResetEmail(email, resetCode);
        return NextResponse.json({ success: true });
    }

    // --- RESET PASSWORD EXECUTE ---
    if (action === 'reset-password') {
        const user = await User.findOne({ email });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        
        if (user.verificationCode !== code) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
        if (new Date() > new Date(user.verificationExpires)) return NextResponse.json({ error: 'Code expired' }, { status: 400 });

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        user.verificationCode = undefined;
        user.verificationExpires = undefined;
        await user.save();

        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}