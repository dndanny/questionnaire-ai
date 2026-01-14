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
    const subs = await Submission.find({ roomId }).sort({ createdAt: -1 });
    return NextResponse.json(subs);
}

// EDIT GRADE MANUALLY (Host)
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

        // Notify Student of Update
        if (sub.studentEmail) {
             const room = sub.roomId; // populated
             await sendGradeEmail(
                sub.studentEmail, 
                sub.studentName, 
                room?.quizData?.title || 'Quiz', 
                total, 
                room?.quizData?.questions?.length * 10, 
                `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/join?code=${room.code}`
             );
        }
    }
    return NextResponse.json({ success: true, submission: sub });
}

// STUDENT SUBMIT
export async function POST(req: Request) {
  const { roomId, studentName, studentEmail, answers } = await req.json();
  await dbConnect();

  const room = await Room.findById(roomId);
  
  // 1. Check Marking Type
  const markingType = room.config?.markingType || 'batch';

  if (markingType === 'batch') {
      // Just save answers, do not grade yet
      await Submission.create({
          roomId,
          studentName,
          studentEmail,
          answers,
          grades: {}, // Empty
          totalScore: 0,
          status: 'pending'
      });
      return NextResponse.json({ success: true, status: 'pending' });
  } 
  
  // 2. Instant Grading
  else {
      const grades: any = {};
      let totalScore = 0;
      
      const promises = room.quizData.questions.map(async (q: any) => {
          const ans = answers[q.id];
          if (ans) {
              const result = await gradeSubmission(q.question, ans, room.materials.join(' '), room.config?.gradingMode || 'strict', q.modelAnswer);
              grades[q.id] = result;
              totalScore += result.score;
          }
      });

      await Promise.all(promises);

      const sub = await Submission.create({
          roomId,
          studentName,
          studentEmail,
          answers,
          grades,
          totalScore,
          status: 'graded'
      });
      
      // Send Email
      if (studentEmail) {
         sendGradeEmail(
             studentEmail, 
             studentName, 
             room.quizData?.title || 'Quiz', 
             totalScore, 
             room.quizData.questions.length * 10, 
             `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/join?code=${room.code}`
         );
      }

      return NextResponse.json({ success: true, grades, totalScore, status: 'graded' });
  }
}