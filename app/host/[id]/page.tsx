'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function RoomDashboard() {
    const params = useParams();
    const router = useRouter();
    const [room, setRoom] = useState<any>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
         const [grading, setGrading] = useState(false);

    
    const fetchSubmissions = () => {
        fetch(`/api/submit?roomId=${params.id}`)
            .then(r => r.json())
            .then(setSubmissions);
    };


    useEffect(() => {
        fetch(`/api/room?id=${params.id}`).then(r => r.json()).then(setRoom);
        fetchSubmissions();
        const interval = setInterval(fetchSubmissions, 5000); // Live poll
        return () => clearInterval(interval);
    }, [params.id]);

    const handleBatchGrade = async () => {
             if(!confirm("Start AI grading for all pending students?")) return;
             setGrading(true);
             await fetch('/api/grade-batch', { method: 'POST', body: JSON.stringify({ roomId: params.id }) });
             setGrading(false);
             fetchSubmissions();
         };
         
         

    if (!room) return <div className="p-10 text-center font-bold">Loading Room...</div>;

    return (
        <div className="min-h-screen bg-brand-100 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Left: Room Info */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="text-center sticky top-8">
                        <h2 className="text-gray-500 uppercase text-xs font-bold mb-2">Join Code</h2>
                        <h1 className="text-5xl font-black mb-4 text-brand-500 tracking-tighter">{room.code}</h1>
                        <div className="flex justify-center mb-4">
                            <QRCodeSVG value={`${window.location.origin}/join?code=${room.code}`} size={150} />
                        </div>
                        <Button variant="secondary" onClick={() => window.location.href='/'} className="w-full text-sm">Back to Dashboard</Button>
         <Link href={`/host/${params.id}/edit`} className="block mt-2">
             <Button className="w-full text-sm bg-yellow-400 hover:bg-yellow-500">⚙️ Edit Quiz & Settings</Button>
         </Link>
                    </Card>
      <div className="mt-4">
          <Button onClick={handleBatchGrade} disabled={grading} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-none border-0">
             {grading ? 'AI Grading...' : '⚡ Grade Pending Subs'}
          </Button>
      </div>
    
                    
                    <Card>
                        <h3 className="font-bold mb-2">Quiz Config</h3>
                        <p className="text-sm">Type: {room.config?.questionTypes?.join(', ')}</p>
                        <p className="text-sm">Grading: {room.config?.gradingMode}</p>
                    </Card>
                </div>

                {/* Right: Submission List */}
                <div className="md:col-span-2">
                    <h2 className="text-2xl font-black mb-6 flex justify-between items-center">
                        Student Results
                        <span className="bg-black text-white text-sm px-3 py-1 rounded-full">{submissions.length}</span>
                    </h2>

                    <div className="space-y-3">
                        {submissions.length === 0 && (
                            <div className="bg-white/50 border-2 border-dashed border-gray-400 p-8 rounded-xl text-center text-gray-500">
                                Waiting for students to submit...
                            </div>
                        )}

                        {submissions.map((sub, idx) => (
                            <Link key={sub._id} href={`/host/${params.id}/submission/${sub._id}`}>
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <Card className="flex justify-between items-center hover:scale-[1.02] hover:shadow-lg transition-all cursor-pointer border-l-8 border-l-brand-500">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                                                {sub.studentName?.charAt(0).toUpperCase() || 'G'}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{sub.studentName || 'Guest'} 
         {sub.studentId?.isVerified && (
             <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
               ✅ Verified
             </span>
         )}</h3>
                                                <p className="text-xs text-gray-400">Submitted {new Date(sub.createdAt).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="block text-2xl font-black text-brand-700">{sub.status === 'pending' ? <span className="text-sm bg-yellow-200 px-2 py-1 rounded">Pending</span> : sub.totalScore}</span>
                                                <span className="text-xs text-gray-400">Total Score</span>
                                            </div>
                                            <div className="text-gray-300">➜</div>
                                        </div>
                                    </Card>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}