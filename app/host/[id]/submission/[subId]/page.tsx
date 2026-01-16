'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';

export default function StudentDetail() {
    const params = useParams(); // { id: roomId, subId: submissionId }
    const router = useRouter();
    const [room, setRoom] = useState<any>(null);
    const [sub, setSub] = useState<any>(null);
    const [editing, setEditing] = useState<{qId: string} | null>(null);
    const [editVal, setEditVal] = useState('');

    useEffect(() => {
        // Fetch Room & Specific Submission
        // We reuse the existing APIs but filter locally or fetch via new endpoint if optimized.
        // For simplicity, we fetch all subs and find one, or fetch list. 
        // Ideally we'd have a specific GET /api/submit/[id], but let's filter the list for now to save route changes.
        
        fetch(`/api/room?id=${params.id}`).then(r => r.json()).then(setRoom);
        
        fetch(`/api/submit?roomId=${params.id}`)
            .then(r => r.json())
            .then(data => {
                const found = data.find((s: any) => s._id === params.subId);
                setSub(found);
            });
    }, [params.id, params.subId]);

    
    const handleFinalize = async () => {
        if (!sub) return;
        const res = await fetch('/api/submit', {
            method: 'PATCH',
            body: JSON.stringify({ submissionId: sub._id, status: 'graded' })
        });
        if (res.ok) {
            const data = await res.json();
            setSub(data.submission);
            alert("Grading marked as Complete! Email sent to student.");
        }
    };

    const handleEditGrade = async () => {
        if (!editing) return;
        
        // Optimistic UI update
        const newScoreNum = Number(editVal);
        // FAIL-SAFE: Check if grade exists
        const oldScore = sub.grades?.[editing.qId]?.score || 0;
        
        // Update local state first
        const updatedSub = { ...sub };
        
        // Init grade object if missing (Common in Manual Mode)
        if (!updatedSub.grades) updatedSub.grades = {};
        if (!updatedSub.grades[editing.qId]) {
            updatedSub.grades[editing.qId] = { score: 0, feedback: "Manually Graded" };
        }

        updatedSub.grades[editing.qId].score = newScoreNum;
        updatedSub.totalScore = (updatedSub.totalScore || 0) - oldScore + newScoreNum;
        setSub(updatedSub);
        setEditing(null);

        await fetch('/api/submit', {
            method: 'PATCH',
            body: JSON.stringify({
                submissionId: sub._id,
                questionId: editing.qId,
                newScore: editVal
            })
        });
    };

    if (!room || !sub) return <div className="p-10 text-center">Loading Details...</div>;

    return (
        <div className="min-h-screen bg-brand-100 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="secondary" onClick={() => router.back()}>← Back</Button>
                    <h1 className="text-2xl font-black flex-1">
                        {sub.studentName}&apos;s Submission
                    </h1>
                    
                <div className="flex items-center gap-4">
                    
                    <div className="flex flex-col items-end gap-2">
                        {sub.status === 'pending' ? (
                            <Button onClick={handleFinalize} className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 shadow-sm">
                                ✅ Mark as Graded
                            </Button>
                        ) : (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                                Status: Graded
                            </span>
                        )}
                    </div>

                    <Card className="px-4 py-2 bg-white flex flex-col items-center">
                        <span className="text-xs text-gray-500 uppercase font-bold">Total Score</span>
                        <span className="text-2xl font-black text-brand-500">{sub.totalScore}</span>
                    </Card>
                </div>
        
        {/* IP Info Card */}
        <Card className="px-4 py-2 bg-gray-50 flex flex-col items-center justify-center border-dashed border-2 border-gray-300">
             <span className="text-xs text-gray-400 uppercase font-bold">Location IP</span>
             <span className="text-sm font-mono font-bold text-gray-700">{sub.ipAddress || 'N/A'}</span>
                    </Card>
                </div>

                <div className="space-y-6">
                    {room.quizData?.questions?.map((q: any, idx: number) => {
                        const grade = sub.grades?.[q.id];
                        const isEditing = editing?.qId === q.id;

                        return (
                            <Card key={q.id} className="relative overflow-visible">
                                <div className="absolute -left-3 -top-3 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold">
                                    {idx + 1}
                                </div>
                                
                                <div className="mt-2 mb-4">
                                    <h3 className="font-bold text-lg mb-2">{q.question}</h3>
                                    <div className="bg-brand-100/50 p-3 rounded-lg border-l-4 border-brand-300">
                                        <p className="text-sm text-gray-500 font-bold mb-1">Student Answer:</p>
                                        <p className="text-gray-800 italic">&quot;{sub.answers?.[q.id] || '(No Answer)'}&quot;</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 pr-4">
                                            <h4 className="text-xs font-black text-gray-400 uppercase mb-1">AI Feedback</h4>
                                            <p className="text-sm text-gray-600 leading-relaxed">{grade?.feedback || 'No feedback generated.'}</p>
                                        </div>

                                        <div className="flex flex-col items-end min-w-[80px]">
                                            <span className="text-xs font-black text-gray-400 uppercase mb-1">Score</span>
                                            
                                            {isEditing ? (
                                                <div className="flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
                                                    <input 
                                                        autoFocus
                                                        type="number" 
                                                        className="w-16 p-1 text-center font-bold border-2 border-brand-500 rounded"
                                                        value={editVal ?? ''}
                                                        onChange={e => setEditVal(e.target.value)}
                                                    />
                                                    <div className="flex gap-1">
                                                        <button onClick={handleEditGrade} className="bg-green-500 text-white text-xs px-2 py-1 rounded font-bold">OK</button>
                                                        <button onClick={() => setEditing(null)} className="bg-red-200 text-red-700 text-xs px-2 py-1 rounded font-bold">X</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div 
                                                    onClick={() => {
                                                        setEditVal(grade?.score ?? '');
                                                        setEditing({ qId: q.id });
                                                    }}
                                                    className="group cursor-pointer text-center"
                                                >
                                                    <div className="text-3xl font-black text-brand-600 group-hover:scale-110 transition-transform">
                                                        {grade?.score || 0}<span className="text-sm text-gray-300 ml-1">/10</span>
                                                    </div>
                                                    <span className="text-[10px] text-brand-500 underline opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}