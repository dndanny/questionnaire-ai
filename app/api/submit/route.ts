import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Submission, Room } from '@/models';
import { getSession } from '@/lib/auth';
import { gradeSubmission } from '@/lib/gemini';
import { sendGradeEmail } from '@/lib/email';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    await dbConnect();
    
    const subs = await Submission.find({ roomId })
        .populate('studentId', 'name email isVerified')
        .sort({ createdAt: -1 });
        
    return NextResponse.json(subs);
}

export async function PATCH(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    try {
        await dbConnect();
        const body = await req.json();
        const { submissionId, questionId, newScore, status } = body;
        
        const sub = await Submission.findById(submissionId).populate('roomId');
        if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // --- SCENARIO 1: UPDATE STATUS (Finalize) ---
        if (status) {
            sub.status = status;
            await sub.save();
            
            // Optional: Send "Grading Complete" email
            if (sub.studentEmail && status === 'graded') {
                 const room = sub.roomId;
                 const publicUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
                 sendGradeEmail(
                    sub.studentEmail, 
                    sub.studentName, 
                    room?.quizData?.title || 'Quiz', 
                    sub.totalScore, 
                    (room?.quizData?.questions?.length || 0) * 10, 
                    `${publicUrl}/join?code=${room.code}`
                 ).catch(console.error);
            }
            return NextResponse.json({ success: true, submission: sub });
        }

        // --- SCENARIO 2: UPDATE SCORE (Existing Logic) ---
        if (!sub.grades) sub.grades = {};
        if (!sub.grades[questionId]) sub.grades[questionId] = { score: 0, feedback: "Graded by Host" };

        sub.grades[questionId].score = Number(newScore);
        sub.markModified('grades');
        
        let total = 0;
        if (sub.grades) Object.values(sub.grades).forEach((g: any) => total += (Number(g.score) || 0));
        sub.totalScore = total;
        
        await sub.save();

        // Note: We removed the automatic email on *every* score edit to reduce spam, 
        // relying on the "Mark as Graded" button for the final notification.
        
        return NextResponse.json({ success: true, submission: sub });

    } catch (e: any) {
        console.error("Patch Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
  const session = await getSession();
  const { roomId, studentName, studentEmail, answers } = await req.json();
  
  // Capture IP from Headers
  
  // Capture IP (Robust for Localhost + Vercel)
  const forwarded = req.headers.get('x-forwarded-for');
  let ipAddress = forwarded ? forwarded.split(',')[0] : (req.headers.get('x-real-ip') || 'Unknown IP');
  
  // Clean up Localhost IPv6
  if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
      ipAddress = '127.0.0.1 (Localhost)';
  }
  
  // Fallback for local development if headers are missing entirely
  if (process.env.NODE_ENV === 'development' && ipAddress === 'Unknown IP') {
      ipAddress = '127.0.0.1 (Dev Env)';
  }


  await dbConnect();

  const room = await Room.findById(roomId);
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  const markingType = room.config?.markingType || 'batch';

  const submissionData = {
      roomId,
      studentName,
      studentEmail,
      studentId: session ? session.id : undefined,
      ipAddress, // Save IP
      answers,
      grades: {} as any,
      totalScore: 0,
      status: 'pending'
  };

  if (markingType === 'batch') {
      await Submission.create(submissionData);
      return NextResponse.json({ success: true, status: 'pending' });
  } else {
      let totalScore = 0;
      const promises = room.quizData.questions.map(async (q: any) => {
          const ans = answers[q.id];
          if (ans) {
              const result = await gradeSubmission(q.question, ans, room.materials.join(' '), room.config?.gradingMode || 'strict', q.modelAnswer);
              submissionData.grades[q.id] = result;
              totalScore += result.score;
          }
      });
      await Promise.all(promises);
      
      submissionData.totalScore = totalScore;
      submissionData.status = 'graded';
      
      const sub = await Submission.create(submissionData);
      
      if (studentEmail) {
         sendGradeEmail(studentEmail, studentName, room.quizData?.title || 'Quiz', totalScore, room.quizData.questions.length * 10, (process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
      }

      return NextResponse.json({ success: true, grades: submissionData.grades, totalScore, status: 'graded' });
  }
}