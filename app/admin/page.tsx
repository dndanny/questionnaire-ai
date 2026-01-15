'use client';
import { useEffect, useState } from 'react';
import { Card, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Users, FileText, Activity, LogOut } from 'lucide-react';

export default function AdminDashboard() {
    const [data, setData] = useState<any>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/admin').then(res => {
            if (!res.ok) router.push('/admin/login');
            else res.json().then(setData);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = async () => {
        await fetch('/api/admin', { method: 'DELETE' });
        router.push('/admin/login');
    };

    const fetchUserDetails = async (id: string) => {
        const res = await fetch(`/api/admin?userId=${id}`);
        if (res.ok) setSelectedUser(await res.json());
    };

    if (!data) return <div className="min-h-screen bg-gray-100 p-10 font-bold">Loading Admin...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-6 md:p-10 font-sans text-gray-800">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900">Admin Dashboard</h1>
                        <p className="text-gray-500 font-medium">System Overview</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-green-100 text-green-800 px-4 py-1 rounded-full font-bold border border-green-200">
                            Active
                        </div>
                        <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
                            <LogOut size={18} /> Sign Out
                        </Button>
                    </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <StatCard icon={<Users />} label="Total Users (Reg + Guest)" value={data.stats.totalUsers} />
                    <StatCard icon={<Activity />} label="Quiz Attempts" value={data.stats.totalAttempts} />
                    <StatCard icon={<FileText />} label="Quizzes Generated" value={data.stats.totalQuizzes} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: USER LIST */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* VERIFIED USERS TABLE */}
                        <Card className="border-2 border-gray-300 shadow-sm">
                            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                                <CheckCircle className="text-brand-500" /> Verified Users
                            </h2>
                            <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0">
                                        <tr>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Email</th>
                                            <th className="p-3">Joined</th>
                                            <th className="p-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.users.map((u: any) => (
                                            <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="p-3 font-bold">{u.name}</td>
                                                <td className="p-3 text-gray-500">{u.email}</td>
                                                <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                                                <td className="p-3">
                                                    <button onClick={() => fetchUserDetails(u._id)} className="text-blue-600 font-bold underline hover:text-blue-800">
                                                        View Stats
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* UNVERIFIED / GUEST TAKERS */}
                        <Card className="border-2 border-gray-300 shadow-sm">
                            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                                <XCircle className="text-gray-400" /> Guest / Unverified Takers
                            </h2>
                            <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0">
                                        <tr>
                                            <th className="p-3">Student Name</th>
                                            <th className="p-3">Contact Email</th>
                                            <th className="p-3">Attempt Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.guests.map((g: any) => (
                                            <tr key={g._id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="p-3 font-bold">{g.studentName || 'Guest'}</td>
                                                <td className="p-3 text-gray-500">{g.studentEmail || 'N/A'}</td>
                                                <td className="p-3">{new Date(g.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT: USER DETAIL PANEL */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            {selectedUser ? (
                                <Card className="border-4 border-black bg-white shadow-[6px_6px_0px_0px_#000]">
                                    <h3 className="text-xl font-black mb-1">{selectedUser.user.name}</h3>
                                    <p className="text-sm text-gray-500 mb-6">{selectedUser.user.email}</p>
                                    
                                    <div className="space-y-4">
                                        <div className="bg-brand-100 p-4 rounded-xl border-2 border-black">
                                            <div className="text-3xl font-black">{selectedUser.stats.hostedRooms}</div>
                                            <div className="text-xs font-bold uppercase">Quizzes Hosted</div>
                                        </div>
                                        <div className="bg-accent-yellow p-4 rounded-xl border-2 border-black">
                                            <div className="text-3xl font-black">{selectedUser.stats.takenQuizzes}</div>
                                            <div className="text-xs font-bold uppercase">Quizzes Taken</div>
                                        </div>
                                        
                                        <div className="pt-4 border-t-2 border-gray-100">
                                            <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-300">
                                                {selectedUser.user.isVerified ? 'Verified Account' : 'Unverified'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <Button variant="secondary" className="w-full mt-6" onClick={() => setSelectedUser(null)}>
                                        Close Details
                                    </Button>
                                </Card>
                            ) : (
                                <div className="border-4 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400 font-bold">
                                    Select a user from the table to see details.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const StatCard = ({ icon, label, value }: any) => (
    <Card className="flex items-center gap-4 border-l-8 border-l-black">
        <div className="bg-gray-100 p-3 rounded-full">{icon}</div>
        <div>
            <div className="text-3xl font-black">{value}</div>
            <div className="text-xs font-bold text-gray-400 uppercase">{label}</div>
        </div>
    </Card>
);