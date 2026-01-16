'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { Trash2, Plus, Save, ArrowLeft } from 'lucide-react';

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
            setTitle(data.quizData?.title || 'Untitled Quiz');
            // Ensure questions array exists
            setQuestions(data.quizData?.questions || []);
        });
    }, [params.id]);

    const handleSave = async () => {
        setSaving(true);
        // Clean up data before sending
        const cleanQuestions = questions.map((q, idx) => ({
            ...q,
            id: q.id || `manual_${Date.now()}_${idx}`, // Ensure ID
            options: q.type === 'MC' ? q.options : [] // Remove options if not MC
        }));

        await fetch('/api/room', {
            method: 'PATCH',
            body: JSON.stringify({
                id: params.id,
                title,
                questions: cleanQuestions
            })
        });
        setSaving(false);
        router.push(`/host/${params.id}`);
    };

    const addQuestion = () => {
        setQuestions([...questions, { 
            id: `new_${Date.now()}`, 
            type: 'Short', 
            question: '', 
            modelAnswer: '',
            options: ['', '', '', ''] 
        }]);
    };

    const removeQuestion = (idx: number) => {
        const newQs = [...questions];
        newQs.splice(idx, 1);
        setQuestions(newQs);
    };

    const updateQuestion = (idx: number, field: string, value: any) => {
        const newQs = [...questions];
        newQs[idx][field] = value;
        setQuestions(newQs);
    };

    const updateOption = (qIdx: number, optIdx: number, value: string) => {
        const newQs = [...questions];
        if (!newQs[qIdx].options) newQs[qIdx].options = [];
        newQs[qIdx].options[optIdx] = value;
        setQuestions(newQs);
    };

    if (!room) return <div className="p-10 text-center">Loading Builder...</div>;

    return (
        <div className="min-h-screen bg-brand-100 p-4 md:p-8 overflow-y-auto font-sans">
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border-4 border-black shadow-sm">
                    <div className="flex items-center gap-4 w-full">
                        <Button variant="secondary" onClick={() => router.back()} className="aspect-square p-0 w-12 flex items-center justify-center rounded-full">
                            <ArrowLeft size={20}/>
                        </Button>
                        <div className="w-full">
                            <label className="text-xs font-bold text-gray-400 uppercase">Quiz Title</label>
                            <input 
                                className="w-full text-2xl font-black border-b-2 border-transparent hover:border-gray-200 focus:border-black outline-none bg-transparent transition-all"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Enter Quiz Title..."
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                         <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white shadow-[4px_4px_0px_0px_#000]">
                            {saving ? 'Saving...' : <><Save size={18} className="mr-2"/> Save & Exit</>}
                         </Button>
                    </div>
                </div>

                {/* QUESTIONS LIST */}
                <div className="space-y-6">
                    {questions.map((q, idx) => (
                        <Card key={idx} className="relative border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-black text-white w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm">
                                    {idx + 1}
                                </span>
                                <div className="flex gap-2">
                                    <select 
                                        className="bg-gray-100 border-2 border-black rounded-lg px-2 py-1 text-sm font-bold cursor-pointer hover:bg-gray-200"
                                        value={q.type}
                                        onChange={(e) => updateQuestion(idx, 'type', e.target.value)}
                                    >
                                        <option value="Short">Short Answer</option>
                                        <option value="Long">Long Answer</option>
                                        <option value="MC">Multiple Choice</option>
                                    </select>
                                    <button 
                                        onClick={() => removeQuestion(idx)} 
                                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="font-bold text-xs text-gray-400 uppercase">Question Text</label>
                                    <textarea 
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl mt-1 font-bold text-lg focus:border-black outline-none min-h-[80px]"
                                        value={q.question}
                                        onChange={e => updateQuestion(idx, 'question', e.target.value)}
                                        placeholder="Type your question here..."
                                    />
                                </div>

                                {/* OPTIONS (MC Only) */}
                                {q.type === 'MC' && (
                                    <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                                        <label className="font-bold text-xs text-gray-400 uppercase mb-2 block">Options</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {[0, 1, 2, 3].map((optIdx) => (
                                                <div key={optIdx} className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                        {['A','B','C','D'][optIdx]}
                                                    </div>
                                                    <input 
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                                        value={q.options?.[optIdx] || ''}
                                                        onChange={e => updateOption(idx, optIdx, e.target.value)}
                                                        placeholder={`Option ${optIdx + 1}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* MODEL ANSWER / KEY */}
                                <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200">
                                    <label className="font-bold text-xs text-yellow-700 uppercase flex items-center gap-2 mb-1">
                                        🔑 Answer Key / Grading Criteria
                                    </label>
                                    <textarea 
                                        className="w-full p-2 border border-yellow-300 rounded-lg text-sm bg-white min-h-[60px]"
                                        placeholder="e.g. The answer must contain 'Photosynthesis'. (Used by AI for grading)"
                                        value={q.modelAnswer || ''}
                                        onChange={e => updateQuestion(idx, 'modelAnswer', e.target.value)}
                                    />
                                </div>
                            </div>
                        </Card>
                    ))}

                    {/* ADD BUTTON */}
                    <button 
                        onClick={addQuestion}
                        className="w-full py-6 border-4 border-dashed border-gray-300 rounded-3xl flex items-center justify-center gap-2 text-gray-400 font-bold hover:border-brand-300 hover:text-brand-500 hover:bg-white transition-all"
                    >
                        <Plus size={24} /> Add New Question
                    </button>
                </div>
            </div>
        </div>
    );
}