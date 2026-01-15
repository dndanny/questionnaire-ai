'use client';
import { useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { Plus, Users, ArrowRight, Trash2, History, Layout } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'host' | 'taker'>('host');
  
  // Host Data
  const [myRooms, setMyRooms] = useState<any[]>([]);
  // Taker Data
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  
  const fetchHostData = async () => {
      const res = await fetch('/api/room?mode=mine');
      if (res.ok) setMyRooms(await res.json());
      setLoading(false);
  };

  const fetchTakerData = async () => {
      const res = await fetch('/api/user/submissions');
      if (res.ok) setMySubmissions(await res.json());
  };


  useEffect(() => {
    fetch('/api/auth/me').then(res => {
        if(res.ok) return res.json();
        window.location.href = '/auth';
        return null;
    }).then(u => {
        if(u) {
            setUser(u);
            fetchHostData();
            fetchTakerData();
        }
    });
  }, []);

  

  

  const handleDelete = async (e: any, id: string) => {
      e.preventDefault();
      if(!confirm("Delete this room?")) return;
      await fetch(`/api/room?id=${id}`, { method: 'DELETE' });
      fetchHostData();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-brand-100 font-sans">
      {/* NAVBAR */}
      <nav className="bg-white border-b-4 border-black px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <Link href="/"><Logo className="text-2xl" /></Link>
        <div className="flex items-center gap-4">
            <span className="font-bold hidden md:block">Welcome, {user.name}</span>
            <button onClick={() => fetch('/api/auth/logout', {method: 'POST'}).then(() => window.location.href='/')}
                className="font-bold text-red-500 hover:bg-red-50 px-3 py-1 rounded">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 md:p-10">
        
        {/* TAB SWITCHER */}
        <div className="flex gap-4 mb-8">
            <button 
                onClick={() => setActiveTab('host')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-lg border-4 border-black transition-all ${activeTab === 'host' ? 'bg-brand-500 text-white shadow-[4px_4px_0px_0px_#000]' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
            >
                <Layout size={20} /> My Classrooms (Host)
            </button>
            <button 
                onClick={() => setActiveTab('taker')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-lg border-4 border-black transition-all ${activeTab === 'taker' ? 'bg-accent-yellow text-black shadow-[4px_4px_0px_0px_#000]' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
            >
                <History size={20} /> My Exam History (Student)
            </button>
        </div>

        {/* --- HOST VIEW --- */}
        {activeTab === 'host' && (
            <>
                <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-black">Manage Rooms</h2>
                     <Link href="/host/create">
                        <Button className="gap-2 shadow-[4px_4px_0px_0px_#000]"><Plus size={20} /> Create Room</Button>
                    </Link>
                </div>

                {loading ? <div className="text-center py-10 opacity-50 font-bold">Loading...</div> : myRooms.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 border-4 border-dashed border-gray-300 rounded-3xl">
                        <h2 className="text-2xl font-bold text-gray-400 mb-4">No rooms yet!</h2>
                        <Link href="/host/create"><Button variant="secondary">Create your first Quiz</Button></Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myRooms.map((room) => (
                            <Link key={room._id} href={`/host/${room._id}`}>
                                <div className="group bg-white p-6 rounded-3xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[8px_8px_0px_0px_#00BCD4] hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-accent-yellow px-3 py-1 font-black text-xs border-b-2 border-l-2 border-black rounded-bl-xl">CODE: {room.code}</div>
                                    <h3 className="font-black text-xl mb-2 pr-8 truncate">{room.quizData?.title || 'Untitled Quiz'}</h3>
                                    <p className="text-sm text-gray-500 mb-6 font-medium">Created {new Date(room.createdAt).toLocaleDateString()}</p>
                                    <div className="flex justify-between items-center mt-auto pt-4 border-t-2 border-gray-100">
                                        <span className="text-sm font-bold text-brand-600 flex items-center gap-1 group-hover:underline">Manage <ArrowRight size={16} /></span>
                                        <button onClick={(e) => handleDelete(e, room._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </>
        )}

        {/* --- TAKER VIEW --- */}
        {activeTab === 'taker' && (
            <>
                 <h2 className="text-2xl font-black mb-6">Tests Taken</h2>
                 {mySubmissions.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 border-4 border-dashed border-gray-300 rounded-3xl">
                        <h2 className="text-2xl font-bold text-gray-400 mb-4">You haven&apos;t taken any tests yet!</h2>
                        <Link href="/join"><Button variant="secondary">Join a Quiz</Button></Link>
                    </div>
                 ) : (
                    <div className="space-y-4">
                        {mySubmissions.map((sub) => (
                            <div key={sub._id} className="bg-white p-6 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold">{sub.roomId?.quizData?.title || 'Unknown Quiz'}</h3>
                                    <p className="text-sm text-gray-500">Taken on {new Date(sub.createdAt).toLocaleDateString()}</p>
                                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded mt-2 inline-block ${sub.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {sub.status}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-brand-600">{sub.totalScore}</div>
                                    <span className="text-xs text-gray-400 font-bold uppercase">Score</span>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
            </>
        )}

      </div>
    </div>
  );
}