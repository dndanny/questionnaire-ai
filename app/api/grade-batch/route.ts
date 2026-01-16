import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Submission, Room, User } from '@/models';
import { getSession } from '@/lib/auth';
import { gradeWholeBatch } from '@/lib/gemini';
import { sendGradeEmail } from '@/lib/email';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    try {
        const { roomId } = await req.json();
        await dbConnect();
        
        // 1. CHECK AI QUOTA
        const user = await User.findById(session.id);
        if (user.aiUsage >= user.aiLimit) {
            return NextResponse.json({ error: 'AI Limit Reached. Contact Admin.' }, { status: 403 });
        }

        const room = await Room.findById(roomId);
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

        // 2. FETCH PENDING
        const pendingSubs = await Submission.find({ roomId, status: 'pending' });
        if (pendingSubs.length === 0) {
            return NextResponse.json({ message: 'No pending submissions.' });
        }

        console.log(`[Batch] Aggregating ${pendingSubs.length} submissions for single-shot grading.`);

        // 3. PREPARE CONTEXT
        let contextText = "";
        try {
            contextText = room.materials.map((m: string) => {
                try { return JSON.parse(m).content || ""; } catch { return m; }
            }).join('\n');
        } catch (e) { contextText = ""; }

        // 4. CALL GEMINI (ONE TIME)
        let batchResults: any = {};
        try {
            batchResults = await gradeWholeBatch(
                contextText,
                room.quizData.questions,
                pendingSubs,
                room.config
            );
            
            // 5. INCREMENT QUOTA (Only on success)
            await User.findByIdAndUpdate(session.id, { $inc: { aiUsage: 1 } });

        } catch (aiError: any) {
            return NextResponse.json({ error: aiError.message }, { status: 500 });
        }

        // 6. SAVE RESULTS
        let processedCount = 0;
        const savePromises = pendingSubs.map(async (sub) => {
            const resultKey = sub._id.toString();
            const gradesData = batchResults[resultKey];

            if (!gradesData) {
                console.error(`[Batch] Missing AI result for ${sub.studentName}`);
                return;
            }

            let totalScore = 0;
            const sanitizedGrades: any = {};

            Object.keys(gradesData).forEach((qId) => {
                const raw = gradesData[qId];
                let s = Number(raw.score);
                if (isNaN(s)) s = 0;
                if (s > 10) s = 10; // Cap score
                
                sanitizedGrades[qId] = {
                    score: s,
                    feedback: raw.feedback || "Graded via Batch AI"
                };
                totalScore += s;
            });

            sub.grades = sanitizedGrades;
            sub.totalScore = totalScore;
            sub.status = 'graded';
            await sub.save();
            processedCount++;

            // Email Notification
            if (sub.studentEmail) {
                const publicUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
                sendGradeEmail(
                    sub.studentEmail, 
                    sub.studentName, 
                    room.quizData?.title || 'Quiz', 
                    totalScore, 
                    room.quizData.questions.length * 10, 
                    `${publicUrl}/join?code=${room.code}`
                ).catch(e => console.error("Email fail:", e));
            }
        });

        await Promise.all(savePromises);

        return NextResponse.json({ 
            success: true, 
            processed: processedCount,
            message: `Batch Complete. ${processedCount} graded. Usage: ${user.aiUsage + 1}/${user.aiLimit}`
        });

    } catch (e: any) {
        console.error("[Batch] Error:", e);
        return NextResponse.json({ error: e.message || 'Server Error' }, { status: 500 });
    }
}