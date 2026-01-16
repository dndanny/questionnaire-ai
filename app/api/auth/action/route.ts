import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/models';
import bcrypt from 'bcryptjs';
import { signSession, logout } from '@/lib/auth';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, recordFailure, resetRateLimit } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, password, name, code, newPassword } = body;
    await dbConnect();

    // Helper for IP
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // --- SIGN UP ---
    
    // --- SIGN UP ---
    if (action === 'signup') {
        const existingUser = await User.findOne({ email });
        const hashed = await bcrypt.hash(password, 10);
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 5 * 60 * 1000); 

        if (existingUser) {
            if (existingUser.isVerified) {
                return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
            }
            // Allow re-registration for unverified users
            existingUser.password = hashed;
            existingUser.name = name;
            existingUser.verificationCode = verifyCode;
            existingUser.verificationExpires = expires;
            // Reset quotas or rate limits if you want, or keep them
            await existingUser.save();
        } else {
            // Create brand new user
            await User.create({ email, password: hashed, name, isVerified: false, verificationCode: verifyCode, verificationExpires: expires });
        }

        await sendVerificationEmail(email, verifyCode);
        return NextResponse.json({ success: true, verify: true, email });
    }


    // --- LOGIN (Protected) ---
    if (action === 'login') {
        try { await checkRateLimit(email, 'login'); } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 429 }); }

        const user = await User.findOne({ email });
        if (!user || !await bcrypt.compare(password, user.password)) {
            await recordFailure(email, 'login');
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
        
        if (!user.isVerified) {
             // ... verification resend logic ...
             return NextResponse.json({ error: 'Unverified', verify: true, email }, { status: 403 });
        }
        
        await resetRateLimit(email, 'login'); // Success resets counter
        await signSession({ id: user._id, email: user.email, name: user.name });
        return NextResponse.json({ success: true });
    }

    // --- RESET PASSWORD EXECUTE (Protected) ---
    if (action === 'reset-password') {
        try { await checkRateLimit(email, 'reset'); } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 429 }); }

        const user = await User.findOne({ email });
        if (!user || user.verificationCode !== code || new Date() > new Date(user.verificationExpires)) {
            await recordFailure(email, 'reset');
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        user.verificationCode = undefined;
        user.verificationExpires = undefined;
        await user.save();
        await resetRateLimit(email, 'reset');

        return NextResponse.json({ success: true });
    }

    // --- FORGOT PASSWORD REQUEST ---
    
    // --- FORGOT PASSWORD REQUEST ---
    if (action === 'forgot-password') {
        try { await checkRateLimit(email, 'forgot'); } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 429 }); }
        
        const user = await User.findOne({ email });
        // Security: Always return 200 if user missing, but for unverified we might want to block
        if (!user) return NextResponse.json({ success: true }); 

        if (!user.isVerified) return NextResponse.json({ error: 'Unverified' }, { status: 403 });

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = resetCode;
        user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000); 
        await user.save();
        await sendPasswordResetEmail(email, resetCode);
        return NextResponse.json({ success: true });
    }

    // --- RESET PASSWORD EXECUTE (Protected) ---
    if (action === 'reset-password') {
        try { await checkRateLimit(email, 'reset'); } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 429 }); }

        const user = await User.findOne({ email });
        if (!user || user.verificationCode !== code || new Date() > new Date(user.verificationExpires)) {
            await recordFailure(email, 'reset');
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        user.verificationCode = undefined;
        user.verificationExpires = undefined;
        await user.save();
        await resetRateLimit(email, 'reset');

        return NextResponse.json({ success: true });
    }

    // --- FORGOT PASSWORD REQUEST ---
    if (action === 'forgot-password') {
        try { await checkRateLimit(email, 'forgot'); } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 429 }); }
        
        const user = await User.findOne({ email });
        if (user && user.isVerified) {
            const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
            user.verificationCode = resetCode;
            user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000); 
            await user.save();
            await sendPasswordResetEmail(email, resetCode);
        } else {
            // Security: Don't tell if user exists, just pretend we sent it
            // OR record failure if you want to stop spamming this endpoint
            await recordFailure(email, 'forgot');
        }
        return NextResponse.json({ success: true });
    }

    // --- VERIFY & RESEND (Simplified for brevity, assume similar pattern) ---
    
    // --- VERIFY ACCOUNT (Protected) ---
    if (action === 'verify') {
        try { await checkRateLimit(email, 'verify'); } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 429 }); }

        const user = await User.findOne({ email });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Check Code
        if (user.verificationCode !== code) {
            await recordFailure(email, 'verify');
            return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
        }
        
        // Check Expiry
        if (new Date() > new Date(user.verificationExpires)) {
            // No rate limit penalty for expiry, just logic fail
            return NextResponse.json({ error: 'Code expired. Please resend.' }, { status: 400 });
        }

        // Success
        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationExpires = undefined;
        await user.save();
        
        await resetRateLimit(email, 'verify'); // Clear rate limits
        await signSession({ id: user._id, email: user.email, name: user.name });
        return NextResponse.json({ success: true });
    }

    // --- RESEND CODE (Protected) ---
    if (action === 'resend') {
        try { await checkRateLimit(email, 'resend'); } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 429 }); }

        const user = await User.findOne({ email });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = verifyCode;
        user.verificationExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        await sendVerificationEmail(email, verifyCode);
        return NextResponse.json({ success: true });
    }


    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}