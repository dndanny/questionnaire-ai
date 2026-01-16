import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User, Room, Submission } from '@/models';
import { cookies } from 'next/headers';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function isAdmin() {
    try {
        const c = await cookies();
        const token = c.get('admin_token')?.value;
        // console.log("[Admin Check] Token:", token); // Uncomment to debug auth
        return token === 'secret_admin_pass';
    } catch (e) {
        console.error("[Admin Check] Error reading cookies:", e);
        return false;
    }
}

export async function POST(req: Request) {
    try {
        console.log("[Admin POST] Received Request");
        const body = await req.json();
        console.log("[Admin POST] Body Action:", body.action);

        // LOGIN
        if (body.action === 'login' || (body.email && body.password && !body.action)) {
            if (body.email === ADMIN_EMAIL && body.password === ADMIN_PASSWORD) {
                console.log("[Admin POST] Login Success");
                (await cookies()).set('admin_token', 'secret_admin_pass', { 
                    httpOnly: true,
                    path: '/',
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                });
                return NextResponse.json({ success: true });
            }
            console.log("[Admin POST] Login Failed: Invalid Credentials");
            return NextResponse.json({ error: 'Invalid Credentials' }, { status: 401 });
        }

        if (!(await isAdmin())) {
            console.log("[Admin POST] Unauthorized Action Attempt");
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        if (body.action === 'update_limit') {
            await User.findByIdAndUpdate(body.userId, { aiLimit: body.limit });
            return NextResponse.json({ success: true });
        }

        if (body.action === 'global_update') {
            await User.updateMany({}, { aiLimit: body.limit });
            return NextResponse.json({ success: true });
        }
        
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (e: any) {
        console.error("[ADMIN POST ERROR]:", e);
        return NextResponse.json({ error: e.message || 'Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        (await cookies()).delete('admin_token');
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        // 1. Auth Check
        if (!(await isAdmin())) {
            // console.log("[Admin GET] Unauthorized");
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // 2. DB Connection
        await dbConnect();
        
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        
        // 3. User Detail Fetch
        if (userId) {
            const user = await User.findById(userId).select('-password');
            if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

            const hosted = await Room.countDocuments({ hostId: user._id });
            const taken = await Submission.countDocuments({ studentId: user._id });
            return NextResponse.json({ user, stats: { hosted, taken } });
        }

        // 4. Dashboard Stats Calculation (CRITICAL AREA)
        // console.log("[Admin GET] Fetching Stats...");

        const registeredCount = await User.countDocuments();
        const distinctGuests = await Submission.distinct('studentEmail', { studentId: null });
        const totalUsers = registeredCount + (distinctGuests ? distinctGuests.length : 0);

        const verifiedUsers = await User.find({ isVerified: true })
            .select('-password')
            .sort({ createdAt: -1 });

        const totalAttempts = await Submission.countDocuments();
        const totalQuizzes = await Room.countDocuments();
        
        const guestSubmissions = await Submission.find({ studentId: null })
            .select('studentName studentEmail createdAt')
            .sort({ createdAt: -1 })
            .limit(50);

        return NextResponse.json({
            stats: { totalUsers, totalAttempts, totalQuizzes },
            users: verifiedUsers,
            guests: guestSubmissions
        });

    } catch (e: any) {
        console.error("[ADMIN GET ERROR]:", e); // <--- WATCH THIS LINE IN TERMINAL
        return NextResponse.json({ error: e.message || 'Server Error' }, { status: 500 });
    }
}