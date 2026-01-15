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
    await dbConnect();
    const { submissionId, questionId, newScore } = await req.json();
    const sub = await Submission.findById(submissionId).populate('roomId');
    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (sub.grades && sub.grades[questionId]) {
        sub.grades[questionId].score = Number(newScore);
        sub.markModified('grades');
        let total = 0;
        Object.values(sub.grades).forEach((g: any) => total += (g.score || 0));
        sub.totalScore = total;
        await sub.save();

        if (sub.studentEmail) {
             const room = sub.roomId;
             await sendGradeEmail(sub.studentEmail, sub.studentName, room?.quizData?.title || 'Quiz', total, room?.quizData?.questions?.length * 10, (process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
        }
    }
    return NextResponse.json({ success: true, submission: sub });
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