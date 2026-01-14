import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Submission } from '@/models';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    // Find submissions by this user, populate room info
    const submissions = await Submission.find({ studentId: session.id })
                                        .populate('roomId')
                                        .sort({ createdAt: -1 });
    
    return NextResponse.json(submissions);
}