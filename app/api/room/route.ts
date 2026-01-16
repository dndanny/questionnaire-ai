import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Room, Submission, User } from '@/models';
import { getSession } from '@/lib/auth';
import { generateQuiz } from '@/lib/gemini';

// Allow longer processing for large AI payloads
export const maxDuration = 60; // 60 seconds (Max for Vercel Hobby)
export const dynamic = 'force-dynamic';

// Helper to scrape text from URL (basic fetch)
async function fetchUrlText(url: string) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    return html.replace(/<[^>]*>?/gm, ' ').substring(0, 10000);
  } catch (e) { return "Error fetching URL content."; }
}

export async function POST(req: Request) {
  const session = await getSession();
  await dbConnect();
  
  try {
    const body = await req.json();

    if (body.action === 'create') {
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        
        let { materials, blueprint, counts, config, manual } = body;
        
        const user = await User.findById(session.id);

        if (!manual) {
            if (user.aiUsage >= user.aiLimit) {
                return NextResponse.json({ error: `AI Limit Reached (${user.aiUsage}/${user.aiLimit}). Create manually or contact admin.` }, { status: 403 });
            }
        }

        let quizData;
        
        if (manual) {
            quizData = { title: "New Manual Quiz", questions: [] };
        } else {
            // Process Content
            // Process Content
            const processedMaterials = await Promise.all(materials.map(async (m: any) => {
                if (m.type === 'url') {
                    const text = await fetchUrlText(m.content);
                    return { type: 'url_content', content: `Content from ${m.content}: \n ${text.substring(0, 50000)}` };
                }
                // Truncate Text/PDF content to prevent Timeout/Payload errors
                if (m.type === 'text' && m.content.length > 50000) {
                    console.log(`[Truncating] Material too long (${m.content.length} chars). Trimming to 50000.`);
                    return { ...m, content: m.content.substring(0, 50000) + "...(truncated)" };
                }
                return m;
            }));

            // Process Blueprint (Optional)
            let processedBlueprint = [];
            if (blueprint && Array.isArray(blueprint)) {
                processedBlueprint = await Promise.all(blueprint.map(async (m: any) => {
                    if (m.type === 'url') {
                        const text = await fetchUrlText(m.content);
                        return { type: 'url_content', content: `Blueprint from ${m.content}: 
 ${text}` };
                    }
                    return m;
                }));
            }
            
            // Pass both to Gemini
            quizData = await generateQuiz(processedMaterials, counts, processedBlueprint);
            
            await User.findByIdAndUpdate(session.id, { $inc: { aiUsage: 1 } });
        }


        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const room = await Room.create({
            hostId: session.id,
            code,
            materials: manual ? [] : materials.map((m: any) => JSON.stringify(m)),
            quizData,
            config: { ...config, counts },
            isActive: true
        });
        
        return NextResponse.json({ roomCode: code, roomId: room._id });
    }

    if (body.action === 'join') {
        let { code } = body;
        if (!code) return NextResponse.json({ error: 'Code missing' }, { status: 400 });
        const room = await Room.findOne({ code: code.trim().toUpperCase() });
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        return NextResponse.json({ roomId: room._id });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ... Keep GET/DELETE/PATCH as they were ...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const mode = searchParams.get('mode');
  await dbConnect();
  
  if (mode === 'mine') {
      const session = await getSession();
      if (!session) return NextResponse.json([]);
      const rooms = await Room.find({ hostId: session.id }).sort({ createdAt: -1 });
      return NextResponse.json(rooms);
  }
  
  if (id) {
      const room = await Room.findById(id);
      if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(room);
  }
  return NextResponse.json({ error: 'Missing params' }, { status: 400 });
}

export async function DELETE(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await dbConnect();
    const room = await Room.findOne({ _id: id, hostId: session.id });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 403 });
    await Room.deleteOne({ _id: id });
    await Submission.deleteMany({ roomId: id }); 
    return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await req.json();
    const { id, title, questions } = body;
    const room = await Room.findOne({ _id: id, hostId: session.id });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (title) room.quizData.title = title;
    if (questions) room.quizData.questions = questions;
    room.markModified('quizData');
    await room.save();
    return NextResponse.json({ success: true });
}