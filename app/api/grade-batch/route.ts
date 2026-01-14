import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Submission, Room } from '@/models';
import { getSession } from '@/lib/auth';
import { gradeSubmission } from '@/lib/gemini';
import { sendGradeEmail } from '@/lib/email';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { roomId } = await req.json();
    await dbConnect();
    const room = await Room.findById(roomId);

    // Find all pending submissions
    const pendingSubs = await Submission.find({ roomId, status: 'pending' });

    if (pendingSubs.length === 0) {
        return NextResponse.json({ message: 'No pending submissions to grade.' });
    }

    // Process all in parallel
    // In a real app, this should be a queue/worker (Redis). 
    // For MVP, we do Promise.all but limit concurrency if needed.
    
    let processed = 0;

    await Promise.all(pendingSubs.map(async (sub) => {
        const grades: any = {};
        let totalScore = 0;

        // Grade each question
        const gradePromises = room.quizData.questions.map(async (q: any) => {
             const ans = sub.answers[q.id];
             if (ans) {
                 const result = await gradeSubmission(
                     q.question, 
                     ans, 
                     room.materials.join(' '), 
                     room.config?.gradingMode || 'strict',
                     q.modelAnswer
                 );
                 grades[q.id] = result;
                 totalScore += result.score;
             }
        });

        await Promise.all(gradePromises);

        // Update DB
        sub.grades = grades;
        sub.totalScore = totalScore;
        sub.status = 'graded';
        await sub.save();
        processed++;

        // Send Email
        if (sub.studentEmail) {
            await sendGradeEmail(
                sub.studentEmail, 
                sub.studentName, 
                room.quizData?.title || 'Quiz', 
                totalScore, 
                room.quizData.questions.length * 10, 
                'http://localhost:3000'
            );
        }
    }));

    return NextResponse.json({ success: true, processed });
}