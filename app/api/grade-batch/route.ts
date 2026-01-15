import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Submission, Room } from '@/models';
import { getSession } from '@/lib/auth';
import { gradeWholeBatch } from '@/lib/gemini';
import { sendGradeEmail } from '@/lib/email';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    try {
        const { roomId } = await req.json();
        await dbConnect();
        
        const room = await Room.findById(roomId);
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

        // 1. Fetch Pending Submissions
        const pendingSubs = await Submission.find({ roomId, status: 'pending' });
        
        if (pendingSubs.length === 0) {
            return NextResponse.json({ message: 'No pending submissions.' });
        }

        console.log(`[Batch] Aggregating ${pendingSubs.length} submissions for single-shot grading.`);

        // 2. Prepare Context (Flatten materials)
        let contextText = "";
        try {
            contextText = room.materials.map((m: string) => {
                try { return JSON.parse(m).content || ""; } catch { return m; }
            }).join('\n');
        } catch (e) { contextText = ""; }

        // 3. CALL GEMINI ONCE
        let batchResults: any = {};
        try {
            batchResults = await gradeWholeBatch(
                contextText,
                room.quizData.questions,
                pendingSubs,
                room.config
            );
        } catch (aiError: any) {
            return NextResponse.json({ error: aiError.message }, { status: 500 });
        }

        // 4. Distribute Results Back to DB
        let processedCount = 0;
        
        // We use a loop to save concurrently
        const savePromises = pendingSubs.map(async (sub) => {
            const resultKey = sub._id.toString();
            const gradesData = batchResults[resultKey]; // The AI output for this student

            if (!gradesData) {
                console.error(`[Batch] Missing AI result for student ${sub.studentName}`);
                return;
            }

            // Calculate Total Score & Sanitize
            let totalScore = 0;
            const sanitizedGrades: any = {};

            Object.keys(gradesData).forEach((qId) => {
                const raw = gradesData[qId];
                let s = Number(raw.score);
                if (isNaN(s)) s = 0;
                if (s > 10) s = 10;
                
                sanitizedGrades[qId] = {
                    score: s,
                    feedback: raw.feedback || "Graded via Batch AI"
                };
                totalScore += s;
            });

            // Save to DB
            sub.grades = sanitizedGrades;
            sub.totalScore = totalScore;
            sub.status = 'graded';
            await sub.save();
            processedCount++;

            // Email Notification (Fire and forget)
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
            message: `Batch Complete. ${processedCount} students graded in one AI call.`
        });

    } catch (e: any) {
        console.error("[Batch] Error:", e);
        return NextResponse.json({ error: e.message || 'Server Error' }, { status: 500 });
    }
}