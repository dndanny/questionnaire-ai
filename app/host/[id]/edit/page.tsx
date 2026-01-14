'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';

export default function EditRoom() {
    const params = useParams();
    const router = useRouter();
    const [room, setRoom] = useState<any>(null);
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch(`/api/room?id=${params.id}`).then(r => r.json()).then(data => {
            setRoom(data);
            setTitle(data.quizData?.title || '');
            setQuestions(data.quizData?.questions || []);
        });
    }, [params.id]);

    const handleSave = async () => {
        setSaving(true);
        await fetch('/api/room', {
            method: 'PATCH',
            body: JSON.stringify({
                id: params.id,
                title,
                questions
            })
        });
        setSaving(false);
        router.push(`/host/${params.id}`);
    };

    const handleDelete = async () => {
        if(!confirm("Are you sure? This will delete the room and ALL student submissions.")) return;
        await fetch(`/api/room?id=${params.id}`, { method: 'DELETE' });
        router.push('/');
    };

    if (!room) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-brand-100 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-black">✏️ Edit Quiz</h1>
                    <div className="flex gap-2">
                         <Button variant="danger" onClick={handleDelete}>Delete Room</Button>
                         <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
                         <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                    </div>
                </div>

                <Card>
                    <label className="font-bold block mb-2">Quiz Title</label>
                    <input 
                        className="w-full p-2 border-2 border-black rounded-lg text-xl font-bold"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                </Card>

                <div className="space-y-6">
                    {questions.map((q, idx) => (
                        <Card key={idx} className="relative">
                            <span className="absolute top-4 right-4 bg-gray-200 px-2 rounded text-xs font-bold">{q.type}</span>
                            <div className="mb-4">
                                <label className="font-bold text-sm text-gray-500 uppercase">Question {idx + 1}</label>
                                <textarea 
                                    className="w-full p-2 border border-gray-300 rounded mt-1 font-medium h-20"
                                    value={q.question}
                                    onChange={e => {
                                        const newQs = [...questions];
                                        newQs[idx].question = e.target.value;
                                        setQuestions(newQs);
                                    }}
                                />
                            </div>

                            {/* Model Answer / Note for AI */}
                            <div className="mb-4 bg-yellow-50 p-3 rounded border border-yellow-200">
                                <label className="font-bold text-xs text-yellow-700 uppercase flex items-center gap-2">
                                    🔑 Teacher's Key / Note for AI
                                    <span className="font-normal text-yellow-600 normal-case">(The AI uses this to grade stricter)</span>
                                </label>
                                <textarea 
                                    className="w-full p-2 border border-yellow-300 rounded mt-1 text-sm h-16 bg-white"
                                    placeholder="e.g. The answer must mention 'Photosynthesis' and 'Sunlight'..."
                                    value={q.modelAnswer || ''}
                                    onChange={e => {
                                        const newQs = [...questions];
                                        newQs[idx].modelAnswer = e.target.value;
                                        setQuestions(newQs);
                                    }}
                                />
                            </div>

                            {/* Options if MC */}
                            {q.type === 'MC' && (
                                <div className="grid grid-cols-2 gap-2">
                                    {q.options?.map((opt: string, optIdx: number) => (
                                        <input 
                                            key={optIdx}
                                            className="p-2 border border-gray-200 rounded text-sm"
                                            value={opt}
                                            onChange={e => {
                                                const newQs = [...questions];
                                                newQs[idx].options[optIdx] = e.target.value;
                                                setQuestions(newQs);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}