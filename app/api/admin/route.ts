import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User, Room, Submission } from '@/models';
import { cookies } from 'next/headers';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Helper to check admin session
async function isAdmin() {
    const c = await cookies();
    return c.get('admin_token')?.value === 'secret_admin_pass';
}

export async function POST(req: Request) {
    const { email, password } = await req.json();
    
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        (await cookies()).set('admin_token', 'secret_admin_pass', { httpOnly: true });
        return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid Credentials' }, { status: 401 });
}

export async function GET(req: Request) {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // Detail View for a specific User
    if (userId) {
        const user = await User.findById(userId).select('-password');
        const hostedRooms = await Room.countDocuments({ hostId: userId });
        const takenQuizzes = await Submission.countDocuments({ studentId: userId });
        return NextResponse.json({ user, stats: { hostedRooms, takenQuizzes } });
    }

    // Dashboard Data
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.find({ isVerified: true }).select('-password').sort({ createdAt: -1 });
    const totalAttempts = await Submission.countDocuments();
    const totalQuizzes = await Room.countDocuments();
    
    // Unverified/Guest Takers (Submissions without studentId or studentId not verified)
    // For simplicity, we list guest submissions (no studentId)
    const guestSubmissions = await Submission.find({ studentId: null }).select('studentName studentEmail createdAt').sort({ createdAt: -1 }).limit(50);

    return NextResponse.json({
        stats: { totalUsers, totalAttempts, totalQuizzes },
        users: verifiedUsers,
        guests: guestSubmissions
    });
}