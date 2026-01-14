'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { motion } from 'framer-motion';
import { messages } from '@/contents/messages/en/message';

const ModernInput = ({ label, value, onChange, placeholder, type = "text", required = false }: any) => (
  <div className="space-y-2">
    <label className="block text-sm font-black uppercase tracking-wider text-gray-700 ml-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full p-4 bg-white border-4 border-black rounded-xl text-lg font-bold placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-brand-300 focus:border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1" />
  </div>
);

export default function JoinPage() {
  const searchParams = useSearchParams();
  const t = messages.join;
  
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [roomData, setRoomData] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [submitted, setSubmitted] = useState(false);
  const [grade, setGrade] = useState<any>(null);

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) setCode(urlCode);
  }, [searchParams]);

  const joinRoom = async () => {
    setError('');
    if (!code.trim() || !name.trim() || !email.trim()) return setError(t.errorEmpty);
    setLoading(true);
    try {
        const res = await fetch('/api/room?t=' + Date.now(), {
            method: 'POST',
            headers: { 'Cache-Control': 'no-store' },
            body: JSON.stringify({ action: 'join', code: code.trim() })
        });
        const data = await res.json();
        if (data.roomId) {
            const r = await fetch(`/api/room?id=${data.roomId}&t=${Date.now()}`);
            setRoomData(await r.json());
            setJoined(true);
        } else { setError('Room not found.'); }
    } catch (e) { setError('Connection failed.'); }
    setLoading(false);
  };

  const submitQuiz = async () => {
    setSubmitted(true);
    await fetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify({ roomId: roomData._id, studentName: name, studentEmail: email, answers })
    }).then(r => r.json()).then(setGrade);
  };

  if (!joined) return (
    <div className="min-h-screen bg-brand-300 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px'}}></div>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md relative z-10">
            <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl bg-white">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black italic tracking-tighter">{t.enterTitle}</h1>
                    <p className="text-gray-500 font-bold mt-2">{t.enterDesc}</p>
                </div>
                <div className="space-y-6">
                    <ModernInput label={t.inputCode} placeholder="A1B2C3" value={code} onChange={(e:any) => setCode(e.target.value.toUpperCase())} required />
                    <ModernInput label={t.inputName} placeholder="Name" value={name} onChange={(e:any) => setName(e.target.value)} required />
                    <ModernInput label={t.inputEmail} type="email" placeholder="Email" value={email} onChange={(e:any) => setEmail(e.target.value)} required />
                    {error && <p className="text-red-500 font-bold text-center">{error}</p>}
                    <Button className="w-full py-4 text-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 bg-accent-yellow text-black font-black" onClick={joinRoom} disabled={loading}>{loading ? t.btnConnecting : t.btnEnter}</Button>
                </div>
            </Card>
        </motion.div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-brand-100 p-8 flex justify-center items-center">
        <Card className="max-w-2xl w-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h1 className="text-4xl font-black mb-4 text-center">{t.result.title}</h1>
            {grade?.status === 'pending' ? (
                <div className="text-center bg-yellow-50 p-6 rounded-2xl border-4 border-yellow-200 border-dashed">
                    <h2 className="text-2xl font-bold text-yellow-800 mb-2">{t.result.pendingTitle}</h2>
                    <p className="text-lg font-medium text-yellow-700">{t.result.pendingDesc}</p>
                    <p className="mt-4 text-gray-500">{t.result.checkEmail}</p>
                </div>
            ) : grade ? (
                <div className="text-center">
                    <span className="text-gray-500 font-bold uppercase text-sm">{t.result.scoreLabel}</span>
                    <div className="text-6xl font-black text-brand-600">{grade.totalScore}</div>
                </div>
            ) : <p className="text-center font-bold animate-pulse">{messages.general.loading}</p>}
            <Button className="mt-8 w-full border-2" onClick={() => window.location.href = '/'}>{messages.general.backHome}</Button>
        </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-8 pb-24">
            <div className="flex justify-between items-center border-b-4 border-black pb-4">
                <h1 className="text-3xl font-black italic">{roomData?.quizData?.title}</h1>
                <span className="bg-brand-100 px-4 py-2 rounded-full font-bold border-2 border-black">{t.taking.studentLabel} {name}</span>
            </div>
            {roomData?.quizData?.questions?.map((q: any, idx: number) => (
                <Card key={q.id || idx} className="relative border-4 border-black shadow-[6px_6px_0px_0px_#ddd]">
                    <div className="absolute -top-5 -left-5 bg-black text-white w-12 h-12 flex items-center justify-center rounded-full font-black text-xl border-4 border-white shadow-lg">{idx + 1}</div>
                    <div className="mt-4 ml-2">
                        <h3 className="text-xl font-bold mb-6 leading-relaxed">{q.question}</h3>
                        {q.type === 'MC' ? (
                            <div className="grid gap-3">
                                {q.options?.map((opt: string) => (
                                    <label key={opt} className={`p-4 border-2 rounded-xl cursor-pointer flex items-center gap-4 ${answers[q.id] === opt ? 'bg-brand-100 border-black' : 'border-gray-200'}`}>
                                        <div className={`w-6 h-6 rounded-full border-2 ${answers[q.id] === opt ? 'bg-black border-black' : 'border-gray-300'}`} />
                                        <input type="radio" name={`q-${q.id}`} className="hidden" onChange={() => setAnswers({...answers, [q.id]: opt})} />
                                        <span className="font-bold">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <textarea className="w-full p-4 border-2 border-gray-300 rounded-xl outline-none focus:border-black font-medium text-lg min-h-[150px]"
                                onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})} />
                        )}
                    </div>
                </Card>
            ))}
            <div className="fixed bottom-6 left-0 w-full px-4 flex justify-center pointer-events-none">
                <Button className="w-full max-w-lg py-4 text-xl bg-green-500 border-4 border-black text-white font-black pointer-events-auto" onClick={submitQuiz}>{t.taking.submitBtn}</Button>
            </div>
        </div>
    </div>
  );
}