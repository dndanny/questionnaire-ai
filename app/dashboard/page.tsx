'use client';
import { useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { Plus, Users, ArrowRight, Trash2 } from 'lucide-react';
import { messages } from '@/contents/messages/en/message';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [myRooms, setMyRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const t = messages.dashboard;

  useEffect(() => {
    fetch('/api/auth/me').then(res => {
        if(res.ok) return res.json();
        window.location.href = '/auth';
        return null;
    }).then(u => {
        if(u) { setUser(u); fetchMyRooms(); }
    });
  }, []);

  const fetchMyRooms = async () => {
      const res = await fetch('/api/room?mode=mine');
      if (res.ok) setMyRooms(await res.json());
      setLoading(false);
  };

  const handleDelete = async (e: any, id: string) => {
      e.preventDefault();
      if(!confirm(t.deleteConfirm)) return;
      await fetch(`/api/room?id=${id}`, { method: 'DELETE' });
      fetchMyRooms();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-brand-100 font-sans">
      <nav className="bg-white border-b-4 border-black px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <Link href="/"><Logo className="text-2xl" /></Link>
        <div className="flex items-center gap-4">
            <span className="font-bold hidden md:block">{messages.landing.nav.welcome}{user.name}</span>
            <button 
                onClick={() => fetch('/api/auth/logout', {method: 'POST'}).then(() => window.location.href='/')}
                className="font-bold text-red-500 hover:bg-red-50 px-3 py-1 rounded"
            >
                {messages.landing.nav.logout}
            </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 md:p-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
                <h1 className="text-4xl font-black mb-2">{t.title}</h1>
                <p className="text-gray-600 font-medium">{t.subtitle}</p>
            </div>
            <Link href="/host/create" className="w-full md:w-auto">
                <Button className="w-full gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none">
                    <Plus size={20} /> {t.createBtn}
                </Button>
            </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card className="bg-white flex items-center gap-4 border-l-8 border-l-brand-500">
                <div className="bg-brand-100 p-3 rounded-full border-2 border-black"><Users size={24} /></div>
                <div>
                    <h3 className="text-3xl font-black">{myRooms.length}</h3>
                    <p className="text-sm font-bold text-gray-400 uppercase">{t.stats.active}</p>
                </div>
            </Card>
        </div>

        {loading ? (
            <div className="text-center py-20 font-bold opacity-50">{messages.general.loading}</div>
        ) : myRooms.length === 0 ? (
            <div className="text-center py-20 bg-white/50 border-4 border-dashed border-gray-300 rounded-3xl">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">{t.stats.noRoomsTitle}</h2>
                <Link href="/host/create"><Button variant="secondary">{t.stats.noRoomsBtn}</Button></Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myRooms.map((room) => (
                    <Link key={room._id} href={`/host/${room._id}`}>
                        <div className="group bg-white p-6 rounded-3xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[8px_8px_0px_0px_#00BCD4] hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-accent-yellow px-3 py-1 font-black text-xs border-b-2 border-l-2 border-black rounded-bl-xl">
                                {t.card.codeLabel} {room.code}
                            </div>
                            <h3 className="font-black text-xl mb-2 pr-8 truncate">{room.quizData?.title || 'Untitled'}</h3>
                            <p className="text-sm text-gray-500 mb-6 font-medium">
                                {t.card.createdPrefix} {new Date(room.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex justify-between items-center mt-auto pt-4 border-t-2 border-gray-100">
                                <span className="text-sm font-bold text-brand-600 flex items-center gap-1 group-hover:underline">
                                    {t.card.manageBtn} <ArrowRight size={16} />
                                </span>
                                <button onClick={(e) => handleDelete(e, room._id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}